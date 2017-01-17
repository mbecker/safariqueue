const path = require('path');
const url = require('url');
const mkdirp = require("mkdirp");
const Promise = require("bluebird");
Promise.promisifyAll(mkdirp);
const sharp = require('sharp');
/*
 * gcloud
 */
const gcloud    = require('google-cloud');
const storage   = gcloud.storage;
const gcs = storage({
  projectId: 'safaridigitalapp',
  keyFilename: 'gcloud.json'
});
/*
 * firebase
 */
const Queue 		= require('firebase-queue');
const Admin = require("firebase-admin");
Admin.initializeApp({
  credential: Admin.credential.cert("safaridigitalapp-firebase-adminsdk-wtgyb-94256f1810.json"),
  databaseURL: "https://safaridigitalapp.firebaseio.com",
  databaseAuthVariableOverride: {
    uid: "safari-worker"
  }
});
const queueRef = Admin.database().ref('queue');
const firebaseRef = "park/kruger/animals/Elephant1-8/images/0";
const imageTypes = [
	"image/jpeg",
	"image/png"
]
const uploadDir = "resized";
const bucketName = 'safaridigitalapp.appspot.com';
const bucket = gcs.bucket(bucketName);

const resizeImage = function(ref, pathDownloadedFile, width, height, toType, toPark, toFile){
	sharp(pathDownloadedFile)
		.resize(width, height)
		.toFile(path.join(__dirname, uploadDir, toType, toPark, toFile))
		.then(function(info){
			console.log(":: bucket.upload start ::")
			var options = {
				destination: path.join(toType, toPark, toFile),
				public: true
            };
            return bucket.upload(path.join(__dirname, uploadDir, toType, toPark, toFile), options)
		})
		.then(function(data){
			var file = data[0];
			console.log(":: bucket.upload end ::");
			let uploadedData = {
				"gcloud": "gs://" + bucketName + "/" + path.join(toType, toPark, toFile),
				"public": file.metadata.mediaLink
			}
			return uploadedData
		})
		.then(function(data){
			return saveDataoToFirebase(ref, data, width + 'x' + height)
		})
}
const saveDataoToFirebase = function(ref, data, imageSize){
	console.log(":: saveDataoToFirebase ::");
	console.log("imageSize: " + imageSize);
	Admin
		.database()
		.ref(ref)
		.child("resized")
		.child(imageSize)
		.update(data)
}

var queue = new Queue(queueRef, function(data, progress, resolve, reject) {
	// Read and process task data
  console.log(":: TASK :: STARTING ...");
  console.log(data);
  progress(1)
  if(!data.hasOwnProperty('ref')) {
    console.error(":: ERROR :: Object missing: data.ref");
    return reject(":: ERROR :: Object missing: data.ref");
  }

  let fileType;
  let fileName;
  let fileNameExtension;
  let fileWithExtension;
  let parkName;

  Admin.database().ref(data.ref).once('value').then(function(snapshot) {
		if(snapshot.val() == null){
	      console.log("snapshot null");
	      return reject("snapshot null");
	    }
	    if(!snapshot.val().hasOwnProperty('public')) {
	      console.log(":: ERROR :: Object missing: snapshot.public");
	      return reject(":: ERROR :: Object missing: snapshot.public");
	    }
	    
	    let pathname = url.parse(snapshot.val().public).pathname;	    
	    let urlArray = pathname.slice(1).split("/");

	    fileType = urlArray[1]
	    fileName = urlArray[urlArray.length - 1];
    	fileNameExtension = fileName.split(".")[0];
	    fileWithExtension = fileName.split(".")[1];
	    parkName = data.ref.split("/")[1]

	    return mkdirp
	    	.mkdirpAsync(path.join(__dirname, uploadDir, fileType, parkName))
			.then(function (dir) {
		    	console.log("Folder created!");
		    	console.log(dir);
		    	return bucket.file(fileType + '/' + fileName);
			})
			.then(function(file){
				console.log(":: file ::");
				
				return file.getMetadata().then(function(data){
					console.log(":: metadata ::");
					var metadata = data[0];
		  			var apiResponse = data[1];
		  			console.log("metadata.contentType: " + metadata.contentType);
		  			if (imageTypes.indexOf(metadata.contentType) == -1) {
		          		return Promise.reject("File is not an image.");
		        	}
		        	let pathDownloadedFile = path.join(__dirname, uploadDir, fileType, parkName, fileName)
		        	return file.download({
		  				destination: pathDownloadedFile
					})
					.then(function(){
						return pathDownloadedFile
					});
				})
				
		        
			})
			.then(function(pathDownloadedFile){
				console.log(":: file.download ::");
				console.log(pathDownloadedFile);
				return sharp(pathDownloadedFile)
						.metadata().then(info => {
							console.log(":: sharp.metadata.info ::");
							console.log(info);
							return [ pathDownloadedFile, info, 350, 300 ];
						})
			})
			.spread(function(pathDownloadedFile, info, width, height){
				console.log(":: sharp image ::");
				Promise.all([
						resizeImage(data.ref, pathDownloadedFile, width, height, fileType, parkName, fileNameExtension + '_' + width + 'x' + height + '.' + fileWithExtension),
						resizeImage(data.ref, pathDownloadedFile, 100, 100, fileType, parkName, fileNameExtension + '_' + 100 + 'x' + 100 + '.' + fileWithExtension)
					])
			})
			.then(function(){
				return resolve();
			})
			.catch(function (e) {
				console.log(":: ERROR ::");
		    	console.error(e);
			});
	})
  	

});
/*
mkdirp.mkdirpAsync("test/animals/addo")
	.then(function (dir) {
    	console.log("Folder created!");
    	console.log(dir);
    	return bucket.file("animals/African_elephant_warning_raised_trunk.jpg");
	})
	.then(function(file){
		console.log(":: file ::");
		
		return file.getMetadata().then(function(data){
			console.log(":: metadata ::");
			var metadata = data[0];
  			var apiResponse = data[1];
  			console.log("metadata.contentType: " + metadata.contentType);
  			if (imageTypes.indexOf(metadata.contentType) == -1) {
          		return Promise.reject("File is not an image.");
        	}
        	let pathDownloadedFile = path.join(__dirname, uploadDir, "animals", "addo", "test.png")
        	return file.download({
  				destination: pathDownloadedFile
			})
			.then(function(){
				return pathDownloadedFile
			});
		})
		
        
	})
	.then(function(pathDownloadedFile){
		console.log(":: file.download ::");
		console.log(pathDownloadedFile);
		return sharp(pathDownloadedFile)
				.metadata().then(info => {
					console.log(":: sharp.metadata.info ::");
					console.log(info);
					return [ pathDownloadedFile, info, 350, 300 ];
				})
	})
	.spread(function(pathDownloadedFile, info, width, height){
		console.log(":: sharp image ::");
		Promise.all([
				resizeImage(firebaseRef, pathDownloadedFile, width, height, "animals", "addo", "test_350x300.png"),
				resizeImage(firebaseRef, pathDownloadedFile, 100, 100, "animals", "addo", "test_100x100.png")
			])
	})
	.catch(function (e) {
		console.log(":: ERROR ::");
    	console.error(e);
	});
*/
