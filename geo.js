/*
 * geo.js
 * Used to get all park items and change the location (latitude, longitude) to a specifc range
 *
 * Addo GPS coordinates
 * 	West:	-33.503256, 25.707996
 * 	East: 	-33.497260, 25.835971
 * 	North:	-33.354899, 25.788557
 * 	South: 	-33.676258, 25.814352
 */
const Promise = require("bluebird");
const Admin = require("firebase-admin");
Admin.initializeApp({
	credential: Admin.credential.cert("safaridigitalapp-firebase-adminsdk-wtgyb-94256f1810.json"),
	databaseURL: "https://safaridigitalapp.firebaseio.com"
});

// Get a database reference to our posts
const Database 			= Admin.database();
const firebaseReference	= Database.ref("park/serengeti/community");

const locationRangeNorth 	= -33.354899
const locationRangeSouth 	= -33.676258
const locationRangeWest		= 25.707996
const locationRangeEast		= 25.835971

let data = [];

firebaseReference.once('value', function(snapshot){
    let snapshotValue = snapshot.val()
    snapshot.forEach(function(item){
    	let value = item.val()
	    item.key = "test"
	    let itemKey = item.key
	    item.forEach(function(key) {
	    	if (key.key == 'location') {
	    		key.forEach(function(location) {
	    			if (location.key == 'latitude') {
	    				value[key.key]['latitude'] = getRandomArbitrary(locationRangeSouth, locationRangeNorth)
	    				value[key.key]['longitude'] = getRandomArbitrary(locationRangeWest, locationRangeEast)
	    				data[itemKey] = value
	    				data['count'] = 1
	    			}
	    		})
	    	}
	    })

  	});
})
.then(function(){
    firebaseReference.set(data)
});

// firebaseReference.on("value", function(snapshot) {
// 	// snapshot.forEach(function(item) {
// 	// 	var itemKey = item.key
// 	// 	let itemValue = item.val()
// 	// 	console.log("-----------")
		
// 	// 	if (itemValue.hasOwnProperty('location')) {
// 	// 		itemValue['location']['latitude'] = getRandomArbitrary(locationRangeSouth, locationRangeNorth)
// 	// 		itemValue['location']['longitude'] = getRandomArbitrary(locationRangeWest, locationRangeEast)
// 	// 	}	
// 	// })

// 	// Using Promise.map:
// 	Promise.map(snapshot, function(item) {
// 	    item.key = "test"
// 	    if (itemValue.hasOwnProperty('location')) {
// 			itemValue['location']['latitude'] = getRandomArbitrary(locationRangeSouth, locationRangeNorth)
// 			itemValue['location']['longitude'] = getRandomArbitrary(locationRangeWest, locationRangeEast)
// 		}
// 	}).then(function() {
// 	    console.log(snapshot);
// 	});

// }, function (errorObject) {
//   console.log("The read failed: " + errorObject.code);
// });

// Attach an asynchronous callback to read the data at our posts reference
// firebaseReference.on("value", function(snapshot) {
// 	snapshot.forEach(function(child){
//         var key1 = child.key;
//         var park = child;
//         park.forEach(function(childPark) {
//         	var key2 = childPark.key;
//         	childPark.forEach(function(items) {
//         		var key3 = items.key;
//         		if (items.val().hasOwnProperty('location')) {
//         			let location = items.val().location
//         			if (location.hasOwnProperty('longitude')) {
//         				let latitude 	= items.val().location["latitude"]
//         				let longitude 	= items.val().location["longitude"]
//         				// console.log('park' + '/' + key1 + '/' + key2 + '/' + key3 + '/location');
//         				let newLatitude 	= getRandomArbitrary(locationRangeSouth, locationRangeNorth)
//         				let newLongitude 	= getRandomArbitrary(locationRangeWest, locationRangeEast)
//         				console.log(newLongitude)
//         				var locationReference = Database.ref('park' + '/' + key1 + '/' + key2 + '/' + key3 + '/location/latitude');
//         				locationReference.set(newLatitude, function(error) {
// 						  if (error) {
// 						    console.log("Data could not be saved." + error);
// 						  } else {
// 						    console.log("Data saved successfully.");
// 						  }
// 						});
						
//         			}
        			
//         		}

//         	})

//         })
//     });
// }, function (errorObject) {
//   console.log("The read failed: " + errorObject.code);
// });

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}
