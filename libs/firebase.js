const Admin 	= require("firebase-admin");
const db = Admin.database();
const ref = db.ref("parkinfo");

exports.getMarkdown = function (park){
 
  return new Promise(function(resolve, reject) {
    const refereneMarkdown = db.ref("markdown");
     refereneMarkdown.child(park).on("value", function(snapshot) {
        resolve(snapshot.val().markdown);
      }, function (errorObject) {
        return reject(errorObject);
      });
    
  });
  
}

exports.sendMarkdown = function(park, message) {
  return new Promise(function(resolve, reject) {
    
    ref.child(park).update({"markdown": message}, function(error){
      if(error) return reject(err);
      resolve({msg: 'success'});
    })
    
  });
}

exports.getParks = function (){
 
  return new Promise(function(resolve, reject) {
      var parks = [];
     ref.on("value", function(snapshot) {
        for (var key in snapshot.val()) {
          parks.push(key);
        }
        return resolve(parks);
      }, function (errorObject) {
        return reject(errorObject);
      });
    
  });
  
}