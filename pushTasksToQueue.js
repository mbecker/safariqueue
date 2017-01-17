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
	// "park/addo/animals/coati-409/images",
	// "park/addo/animals/Elephant1-123/images",
	// "park/addo/animals/Elephant1-123/images",
	// "park/addo/animals/coati-409/images",
	// "park/addo/animals/coati-535/images",
	// "park/addo/animals/coyote-432/images",
	// "park/addo/animals/elephants-raising-trunk-514/images",
	// "park/addo/animals/elpehants-drinking-626/images",
	// "park/addo/animals/giraffes-eating-505/images",
	// "park/addo/animals/greenmountains-453/images",
	// "park/addo/animals/lions-in-the-wildness-943/images",
	// "park/addo/animals/lions-on-the-street-445/images",
	// "park/addo/animals/mandrill-869/images",
	// "park/addo/animals/ocelot-938/images",
	// "park/addo/attractions/-KZaCv_ljXAZLM7nkfM4addclose/images",
 // "park/addo/attractions/childrenplace-736/images",
 // "park/addo/attractions/home-622/images",
 // "park/addo/attractions/mainentry-789/images",
 // "park/addo/attractions/picnic-551/images",
 // "park/kruger/animals/Elephant1-8/images",
 "park/kruger/animals/-KY_9_E_ZYdmijuagawr/images"
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

