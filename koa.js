const path	= require('path');
const fs		= require('fs');
const koa		= require('koa');
const auth	= require('koa-basic-auth');
const route = require('koa-route');
const views = require('co-views');
const koaStatic = require('koa-static');
const app 	= module.exports = koa();

// setup views, appending .ejs
// when no extname is given to render()

var render = views(path.join(__dirname, '/views'), { ext: 'ejs' });

// Static files
app.use(koaStatic(__dirname + '/public'));

// custom 401 handling
app.use(function* (next) {
  try {
    yield next;
  } catch (err) {
    if (401 == err.status) {
      this.status = 401;
      this.set('WWW-Authenticate', 'Basic');
      this.body = 'Permission denied.';
    } else {
      throw err;
    }
  }
});

// Middleware: Auth
app.use(auth({ name: 'mbecker', pass: '1234' }));

// Routes
app.use(route.get('/', logs));
app.use(route.get('/logs', logs));
app.use(route.get('/log/:id', log));

function *logs() {
  var logs = {};
	var files = [];

  try {
    files = fs.readdirSync(__dirname + '/logs');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Directory log does not exist.');
    } else {
      throw err;
    }
  }
	
  files.forEach(function(element, index, array){
    if(path.extname(element) == ".log") {
      let logContent  = fs.readFileSync(__dirname + '/logs/' + element, 'utf8');
      let logLines    = logContent.split(/\r?\n/);
      
      var logLinesJsonArray = [];
      logLines.forEach(function(element, index, array){
        if(element.length > 0){
          let parsedLineToJSON = JSON.parse(element);
          logLinesJsonArray.push(parsedLineToJSON); 
        }
      })
      
      logs[element.slice(0, element.length - 4)] = logLinesJsonArray
    }
  });
  
  this.body = yield render('mail', { logs: logs });
  
  // Write json object to file (logs.json)
  try {
    fs.writeFile(__dirname + '/logs/' + 'logs.json', JSON.stringify(logs, null, 4), 'utf8', (err) => {
      if (err) console.log(err);
      console.log(':: Write File :: logs.json saved');
    });  
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Directory log does not exist.');
    } else {
      throw err;
    }
  }

}

function *log(fileDate) {
  var logs = {}
  var logFilesJsonArray = [];
  var logLinesJsonArray = [];
  
  /*
   * logFiles: Get all filenames in dir '/log'
   */
  let logfiles    = fs.readdirSync(__dirname + '/logs');
  logfiles.forEach(function(element, index, array){
    if(path.extname(element) == ".log") {
      logFilesJsonArray.push(element.slice(0, element.length - 4))  
    }
  });
  
  /*
   * logLines: Get for specific log file the josn data
   */
	let logContent  = fs.readFileSync(__dirname + '/logs/' + fileDate + ".log", 'utf8');
  let logLines    = logContent.split(/\r?\n/);
	logLines.forEach(function(element, index, array){
    if(element.length > 0){
      let parsedLineToJSON = JSON.parse(element);
      logLinesJsonArray.push(parsedLineToJSON); 
    }
  })
  
  /*
   * JSON Data
   */
  logs["current"] = fileDate  
  logs["files"]   = logFilesJsonArray
  logs["data"]    = logLinesJsonArray;
  // console.log(logs);
  
  this.body = yield render('mail', { logs: logs });
}



if (!module.parent) app.listen(3000);