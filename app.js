const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const url = require('url');
const Admin = require("firebase-admin");
const Queue 		= require('firebase-queue');
var gcloud    = require('google-cloud');
var storage   = gcloud.storage;
const FOLDER = "download";
const RESIZEDFOLDER = "resized";
const sharp = require('sharp');

// Initialize Firebase Admin
Admin.initializeApp({
  credential: Admin.credential.cert("safaridigitalapp-firebase-adminsdk-wtgyb-94256f1810.json"),
  databaseURL: "https://safaridigitalapp.firebaseio.com",
  databaseAuthVariableOverride: {
    uid: "safari-worker"
  }
});
// Initialize Google Cloud Storage
var gcs = storage({
  projectId: 'safaridigitalapp',
  keyFilename: 'gcloud.json'
});
var bucket = gcs.bucket('safaridigitalapp.appspot.com');

var firebaseRef = Admin.database().ref('queue');
var queue = new Queue(firebaseRef, function(data, progress, resolve, reject) {
  // Read and process task data
  console.log(":: TASK :: STARTING ...");
  console.log(data);
  progress(1)
  if(!data.hasOwnProperty('ref')) {
    console.log(":: ERROR :: Object missing: data.image");
    return reject(":: ERROR :: Object missing: data.image");
  }
  
  // Read firebase snapshot from task ref
  Admin.database().ref(data.ref).once('value').then(function(snapshot) {
    // console.log(snapshot.val());

    if(!snapshot.val().hasOwnProperty('gcloud')) {
      console.log(":: ERROR :: Object missing: snapshot.gcloud");
      return reject(":: ERROR :: Object missing: snapshot.gcloud");
    }
    // Get gcloud url from firebase
    let gcloudURL = snapshot.val().gcloud;
    // Get URL pathname
    var pathname = url.parse(gcloudURL).pathname;
    // Slice URL into parts
    var urlArray = pathname.slice(1).split("/");
    // Get filename and extension
    let localFileFolder = urlArray[0];
    let localFile = urlArray[1];
    let localFileName = urlArray[1].split(".")[0];
    let localFileExtension = urlArray[1].split(".")[1];
    // Get file from google storage bucket
    var gcsFile = bucket.file(localFileFolder + '/' + localFile);

    let downloadFolder = FOLDER + "/" + localFileFolder;
    mkdirp(path.join(__dirname, downloadFolder), function (err) {
      if(err){
        console.log(err);
        return reject(err);
      }
      // Check file
      gcsFile.getMetadata(function(err, metadata, apiResponse) {
        if (metadata.contentType != "image/jpeg") {
          console.log(":: ERROR :: File is no image/jpeg");
          return reject(":: ERROR :: File is no image/jpeg");
        }
        // Download file
        var localFilepath = path.join(__dirname, downloadFolder, urlArray[1]);
        gcsFile.createReadStream()
          .on('error', function(err) {
            console.log(err);
            return reject(err);
          })
          .on('response', function(response) {
            // Server connected and responded with the specified status and headers.
            console.log(":: IMAGE :: Downloading image");
           })
          .on('end', function() {
            // The file is fully downloaded.
            console.log(":: IMAGE :: Downloading end");

            // Resize image
            sharp(localFilepath)
              .metadata()
              .then(info => {
                // ToDo: Check image ration and based on that resize (landscape, potrait)
                // const width = Math.round(info.width * 50 / 100);
                // const height = Math.round(info.height * 50 / 100);
                const width = 375;
                const height = 300;
                let resizedFolder = FOLDER + "/" + localFileFolder + "/resized/";
                let resizedFile = resizedFolder + localFileName + "_375x300." + localFileExtension;
                
                mkdirp(path.join(__dirname, resizedFolder), function (err) {
                  sharp(localFilepath)
                  .resize(width, height)
                  .toFile(resizedFile, (err, info) => {
                    if(err) {
                      console.log(err);
                      return reject(err);
                    }

                    // Upload file
                    var options = {
                      destination: localFileFolder + "/" + path.basename(resizedFile),
                      public: true
                    };

                    bucket.upload(resizedFile, options, function(err, uploadedFile) {
                      if(err) {
                        console.log(err);
                        return reject(err);
                      }
                      
                      var storagelocation = "gs://safaridigitalapp.appspot.com/" + localFileFolder;
                      var uploadedData = {
                          "gcloud": storagelocation + "/" + path.basename(resizedFile),
                          "public": uploadedFile.metadata.mediaLink
                      }

                      Admin.database().ref(data.ref).child("resized").child("375x300").update(uploadedData, function(err){
                        if(err){
                          console.log(err);
                          return reject(err);
                        }

                        let resizedFile100x100 = resizedFolder + localFileName + "_100x100." + localFileExtension;
                        sharp(localFilepath)
                          .resize(100, 100)
                          .toFile(resizedFile100x100, (err, info) => {
                            var options = {
                              destination: localFileFolder + "/" + path.basename(resizedFile100x100),
                              public: true
                            };
                            if(err) {
                              console.log(err);
                              return reject(err);
                            }
                            
                            var storagelocation = "gs://safaridigitalapp.appspot.com/" + localFileFolder;
                            var uploadedData = {
                                "gcloud": storagelocation + "/" + path.basename(resizedFile100x100),
                                "public": uploadedFile.metadata.mediaLink
                            }
                            bucket.upload(resizedFile100x100, options, function(err, uploadedFile) {
                              if(err) {
                                console.log(err);
                                return reject(err);
                              }
                              var uploadedData = {
                                  "gcloud": storagelocation + "/" + path.basename(resizedFile),
                                  "public": uploadedFile.metadata.mediaLink
                              }
                              Admin.database().ref(data.ref).child("resized").child("100x100").update(uploadedData, function(err){
                                if(err){
                                  console.log(err);
                                  return reject(err);
                                }
                                
                                setTimeout(function() {
                                    console.log(":: TASK :: FINISHED");
                                    resolve();
                                  }, 1000);

                              })
                            })
                            
                          })
                        

                      });

                    })
                    
                    


                  })
                })
                
              })

            
          })
          .pipe(fs.createWriteStream(localFilepath));
      })
      

    })

    
  });

});

process.on('SIGINT', function() {
  console.log('Starting queue shutdown');
  queue.shutdown().then(function() {
    console.log('Finished queue shutdown');
    process.exit(0);
  });
});

//function will check if a directory exists, and create it if it doesn't
function checkDirectory(directory, callback) {  
  fs.stat(directory, function(err, stats) {
    //Check if error defined and the error code is "not exists"
    if (err && err.errno === 34) {
      //Create the directory, call the callback.
      fs.mkdir(directory, callback);
    } else {
      //just in case there was a different error:
      callback(err)
    }
  });
}