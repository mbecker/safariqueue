const path	= require('path');
const fs		= require('fs');
const koa		= require('koa');
const auth	= require('koa-basic-auth');
const router  = require('koa-router')();
const koaBody = require('koa-body')();
const views = require('co-views');
//const koaStatic = require('koa-static');
const app 	= module.exports = koa();

const Admin 	= require("firebase-admin");
Admin.initializeApp({
  credential: Admin.credential.cert("safaridigitalapp-firebase-adminsdk-wtgyb-94256f1810.json"),
  databaseURL: "https://safaridigitalapp.firebaseio.com",
  databaseAuthVariableOverride: {
    uid: "safari-worker"
  }
});
const db = Admin.database();

const firebase = require('./libs/firebase');

// setup views, appending .ejs
// when no extname is given to render()

var render = views(path.join(__dirname, '/views'), { ext: 'ejs' });

// Static files
// app.use(koaStatic(__dirname + '/public'));

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

router.get('/', function*(next){
  this.body = yield render('index');
});

router.get('/logs', function*(next){
  var logs = {};
  var logFiles = [];
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

      logFiles.push(element.slice(0, element.length - 4))
      
      /*
      var logLinesJsonArray = [];
      logLines.forEach(function(element, index, array){
        if(element.length > 0){
          let parsedLineToJSON = JSON.parse(element);
          logLinesJsonArray.push(parsedLineToJSON); 
        }
      })
      
      logs[element.slice(0, element.length - 4)] = logLinesJsonArray
      */
    }
  });
  logs.files = logFiles.reverse();
  
  this.body = yield render('logs', { logs: logs });
  
  // Write json object to file (logs.json)
  fs.writeFile(__dirname + '/logs/' + 'logs.json', JSON.stringify(logs, null, 4), 'utf8', (err) => {
    if (err) return console.log(err);
  });
});

router.get('/log/:id', function*(next){
  var logs = {}
  var logFilesJsonArray = [];
  var logLinesJsonArray = [];
  
  /*
   * logFiles: Get all filenames in dir '/log'
   */
  var logfiles = [];
  try {
    logfiles = fs.readdirSync(__dirname + '/logs');
  } catch(err) {
    if (err.code === 'ENOENT') {
      console.log('Directory log does not exist.');
    } else {
      throw err;
    }
  }
  
  logfiles.forEach(function(element, index, array){
    if(path.extname(element) == ".log") {
      logFilesJsonArray.push(element.slice(0, element.length - 4))  
    }
  });
  
  /*
   * logLines: Get for specific log file the josn data
   */
  var logContent;
  try {
    logContent    = fs.readFileSync(__dirname + '/logs/' + this.params.id + ".log", 'utf8');
    let logLines  = logContent.split(/\r?\n/);
    logLines.forEach(function(element, index, array){
      if(element.length > 0){
        let parsedLineToJSON = JSON.parse(element);
        logLinesJsonArray.push(parsedLineToJSON); 
      }
    })
  } catch(err) {
    if (err.code === 'ENOENT') {
      console.log('Directory log does not exist.');
    } else {
      throw err;
    }
  }
	
  /*
   * JSON Data
   */
  logs["current"] = this.params.id
  if(logFilesJsonArray.length > 0){
    logs["files"]   = logFilesJsonArray.reverse()
  }  
  if(logLinesJsonArray.length > 0){
    logs["data"]    = logLinesJsonArray;  
  }
  
  this.body = yield render('logs', { logs: logs });
});

router.get('/markdown', function *(next){
  var parks = yield firebase.getParks();
  this.body = yield render('markdown', { parks: parks });
});

router.get('/markdown/:park', function*(next){
  var markdown = yield firebase.getMarkdown(this.params.park)
  var parks = yield firebase.getParks();
  this.body = yield render('markdown', { active: this.params.park, parks: parks, markdown: markdown });
});

router.post('/markdown/:park', koaBody,
  function *(next) {
    // console.log(this.request.body.msg);
    var firebaseReturn = yield firebase.sendMarkdown(this.params.park, this.request.body.msg)
    this.body = JSON.stringify(firebaseReturn);
});


app
  .use(router.routes())
  .use(router.allowedMethods());


if (!module.parent) app.listen(3000);

