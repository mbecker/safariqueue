var path = '/items/park/addo/animals/ID';
var splitted = path.split('/');
var spliced = splitted.splice(0, 1);
var map = splitted.map(function(obj){
	if (obj.length > 0) {
  	return obj
  }
});
console.log(splitted);
console.log(splitted);
console.log(map);
console.log(splitted[0] + '/' + splitted[1] + '/' + splitted[2] + '/count')