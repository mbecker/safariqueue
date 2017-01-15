var firebase 	= require("firebase");
var Queue 		= require('firebase-queue');
// Initialize Firebase
var config = {
  	apiKey: "AIzaSyB6NW9Z-UEEEgyv262uXJLzSHCALFkVOPI",
  	authDomain: "safaridigitalapp.firebaseapp.com",
	databaseURL: "https://safaridigitalapp.firebaseio.com",
    storageBucket: "safaridigitalapp.appspot.com",
    messagingSenderId: "78200485035"
};
firebase.initializeApp(config);

let ref = firebase.database().ref('queue/tasks');
let data = {
	"ref": "park/addo/animals/Elephant1-123/images"
};
let data2 = [
	"park/addo/attractions/-KZaCv_ljXAZLM7nkfM4addclose/images"
];
data2.forEach(function(refData, index, array) {
	let data = {
		"ref": refData
	};
	ref.push(data, function(err) {
		if(err){
			console.log(err, err);
			// return process.exit(0);
		} else {
			console.log(refData);
			console.log("-> Data pushed to Firebase");
		}
		
		if (index === array.length - 1){ 
       		return process.exit(0);
   		}
		
	});
});

