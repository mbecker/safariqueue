const winston 	= require('winston');
winston.add(winston.transports.File, { filename: 'logfile.log' });
require('winston-daily-rotate-file');
 winston.configure({
    transports: [
    	new (winston.transports.Console)(),
      new winston.transports.DailyRotateFile({
		    filename: './logs/log',
		    datePattern: 'yyyy-MM-dd.',
		    prepend: true,
		    level: process.env.ENV === 'development' ? 'debug' : 'info'
		  })
    ]
  });

const path 		= require('path');
const url 		= require('url');
const mkdirp 	= require("mkdirp");
const Promise 	= require("bluebird");
Promise.promisifyAll(mkdirp);
const sharp 	= require('sharp');
/*
 * gcloud
 */
const gcloud    = require('google-cloud');
const storage   = gcloud.storage;
const gcloud_storage = storage({
  projectId: 'safaridigitalapp',
  keyFilename: 'gcloud.json'
});
/*
 * firebase
 */
const Queue 	= require('firebase-queue');
const Admin 	= require("firebase-admin");
Admin.initializeApp({
  credential: Admin.credential.cert("safaridigitalapp-firebase-adminsdk-wtgyb-94256f1810.json"),
  databaseURL: "https://safaridigitalapp.firebaseio.com",
  databaseAuthVariableOverride: {
    uid: "safari-worker"
  }
});
const queueRef = Admin.database().ref('queue');

/*
 * CONSTANTS
 */
const CONST_IMAGE_QUALITY = 80;
const CONST_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png"
]
const CONST_UPLOAD_DIR = "resized";
const CONST_gcloud_bucket_NAME = 'safaridigitalapp.appspot.com';
const gcloud_bucket = gcloud_storage.bucket(CONST_gcloud_bucket_NAME);

const resizeImage = function(ref, pathDownloadedFile, width, height, toType, toPark, toFile){
	return sharp(pathDownloadedFile)
		.resize(width, height)
		.quality(CONST_IMAGE_QUALITY)
		.toFile(path.join(__dirname, CONST_UPLOAD_DIR, toType, toPark, toFile))
		.then(function(info){
			winston.log('info', ':: bucket.upload ::', { data: {toType: toType, toPark: toPark, toFile: toFile} });
			var options = {
				destination: path.join(toType, toPark, toFile),
				public: true
            };
            return gcloud_bucket.upload(path.join(__dirname, CONST_UPLOAD_DIR, toType, toPark, toFile), options)
		})
		.then(function(data){
			var file = data[0];
			winston.log('info', ':: bucket.upload ::', { data: {file_metadata_media: file.metadata.media} });
			let uploadedData = {
				"gcloud": "gs://" + CONST_gcloud_bucket_NAME + "/" + path.join(toType, toPark, toFile),
				"public": file.metadata.mediaLink
			}
			return uploadedData
		})
		.then(function(data){
			return saveDataToFirebase(ref, data, width + 'x' + height)
		})
		.then(function(){
			return winston.log('info', ':: saveDataToFirebase - finished ::');
		})
}
const saveDataToFirebase = function(ref, data, imageSize){
	winston.log('info', ':: saveDataToFirebase ::', { data: {ref: ref, data: data, imageSize: imageSize} });
	return Admin
		.database()
		.ref(ref)
		.child("resized")
		.child(imageSize)
		.update(data)
}

var queue = new Queue(queueRef, function(data, progress, resolve, reject) {
	// Read and process task data
	winston.log('info', ':: TASK STARTING ::', { data: data });

  	progress(1)
  	if(!data.hasOwnProperty('ref')) {
  		winston.log('error', 'Object missing: data.ref');
    	return reject(":: ERROR :: Object missing: data.ref");
  	}

  	let firebaseRef = data.ref;
  let fileType;
  let fileName;
  let fileNameExtension;
  let fileWithExtension;
  let parkName;

  Admin.database().ref(firebaseRef).once('value').then(function(snapshot) {
		if(snapshot.val() == null){
	      winston.log('error', 'firebase snapshot.val() null');
	      return reject(":: ERROR :: firebase snapshot.val() null");
	    }
	    if(!snapshot.val().hasOwnProperty('public')) {
	    	winston.log('error', 'snapshot snapshot.val().public null');
	      	return reject(":: ERROR :: firebase snapshot.val().public null");
	    }
	    let snapshotData = snapshot.val();
	    let pathname = url.parse(snapshotData.public).pathname;	    
	    let urlArray = pathname.slice(1).split("/");

	    fileType = urlArray[1]
	    fileName = urlArray[urlArray.length - 1];
    	fileNameExtension = fileName.split(".")[0];
	    fileWithExtension = fileName.split(".")[1];
	    parkName = data.ref.split("/")[1]

	    return mkdirp
	    	.mkdirpAsync(path.join(__dirname, CONST_UPLOAD_DIR, fileType, parkName))
			.then(function (dir) {
				progress(1);
				if(dir != null){
					winston.log('info', ':: mkdirpAsync - Folder created ::', { data: dir });
				}
		    	return gcloud_bucket.file(fileType + '/' + fileName);
			})
			.then(function(file){
				progress(2);
				winston.log('info', ':: gcloud_bucket.file - get file reference ::');
				
				return file.getMetadata().then(function(data){
					progress(3);
					winston.log('info', ':: file.getMetadata - get file metadata ::');
					var metadata = data[0];
		  			var apiResponse = data[1];
		  			if (CONST_IMAGE_TYPES.indexOf(metadata.contentType) == -1) {
		  				winston.log('error', '- IMAGE IS NOT IMAGE TYPE', { data: metadata.contentType });
		          		return Promise.reject("File is not an image.");
		        	}
		        	let pathDownloadedFile = path.join(__dirname, CONST_UPLOAD_DIR, fileType, parkName, fileName)
		        	return file.download({
		  				destination: pathDownloadedFile
					})
					.then(function(){
						progress(4);
						return pathDownloadedFile
					});
				})
				
		        
			})
			.then(function(pathDownloadedFile){
				progress(5);
				
				winston.log('info', ':: file.download ::', { data: pathDownloadedFile });
				
				return sharp(pathDownloadedFile)
						.metadata().then(info => {
							progress(6);
							
							winston.log('info', ':: sharp.metadata ::', { data: info });
							
							return [ pathDownloadedFile, info, 375, 300 ];
						})
			})
			.spread(function(pathDownloadedFile, info, width, height){
				progress(7);
				winston.log('info', ':: sharp.image - resizeImage ::', { data: {width: width, height: height} });
				Promise.all([
						resizeImage(data.ref, pathDownloadedFile, width, height, fileType, parkName, fileNameExtension + '_' + width + 'x' + height + '.' + fileWithExtension),
						resizeImage(data.ref, pathDownloadedFile, 100, 100, fileType, parkName, fileNameExtension + '_' + 100 + 'x' + 100 + '.' + fileWithExtension),
						resizeImage(data.ref, pathDownloadedFile, 600, 600, fileType, parkName, fileNameExtension + '_' + 600 + 'x' + 600 + '.' + fileWithExtension)
					])
				.then(function(){
					
					let itemPath	= firebaseRef.replace('items/','park/');
					itemPath 		= itemPath.replace('/images','');
					firebaseRef 	= firebaseRef.replace('/images','');
					Admin.database().ref(firebaseRef).once('value').then(function(snapshot) {
						winston.log('info', ':: MOVED ITEM TO PARK - GET DATA ::');
						Admin.database().ref(itemPath).set(snapshot.val(), function(error){
							if(error){
								winston.log('error', ":: MOVED ITEM TO PARK - SAVE DATA", error);
								return reject(error);
							}
							winston.log('info', ':: MOVED ITEM TO PARK - WRITE DATA SUCCESS ::');
							winston.log('info', ':: TASK FINISHED - Data moved::');
						})
							
					})

					
				})
			})
			.then(function(){
				winston.log('info', ':: TASK FINISHED - return resolve() ::');
				progress(90);

				return resolve();
			})
			.catch(function (e) {
				winston.log('error', e);
		    	return reject(e);
			});
	})
  	

});