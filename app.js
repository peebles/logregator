var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var winston = require( "winston" );
var async = require( 'async' );
var _ = require( 'lodash' );
require( 'json-lucene-like-query' );

var app = express();
app.config = require( 'env-friendly-config' )( __dirname + '/config.json' );

app.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 
      colorize: true,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      level: app.config.logger.level
    }),
  ],
  exitOnError: false
});

if ( process.env.PROXY_USERNAME ) app.config.auth.username = process.env.PROXY_USERNAME;
if ( process.env.PROXY_PASSWORD ) app.config.auth.username = process.env.PROXY_PASSWORD;

var routes = require('./routes/index')( app );
var utils = require( './utils' );
var DBUtils;

// Incoming messages
var mq = async.queue( function( json, cb ) {
  var fullLine;
  if ( json.program )
    fullLine = json.timestamp + ' ' + json.host + ' - ' + json.program + ': ' + json.message;
  else
    fullLine = json.timestamp + ' ' + json.host + ' - ' + json.message;
  //app.log.debug( fullLine );
  app.get( 'lineQueue' ).add( json );
  DBUtils.handle_line( fullLine, json, cb );
}, 1 );

app.set( 'lineQueue', require( './line-queue' )( app ) );

async.series([
  function( cb ) {
    utils.setupDatabase( app, app.config.db, function( err, db ) {
      if ( err ) return cb( err );
      app.set( 'db', db );
      cb();
    });
  },
  function( cb ) {
    utils.setupProxyServers( app, mq, function( err ) {
      if ( err ) return cb( err );
      cb();
    });
  },
  function( cb ) {
    let root = app.config.logs.location || '/tmp';
    let allLog = require( 'path' ).join( root, 'all.log' );
    // Read the file if it exists and initialize the line queue
    const fs = require( 'fs' );
    const readline = require( 'readline' );
    console.log( 'Looking for', allLog );
    if ( ! fs.existsSync( allLog ) ) return process.nextTick( cb );
    const rl = readline.createInterface({
      input: fs.createReadStream( allLog ),
      crlfDelay: Infinity
    });
    console.log( 'initializing line queue...' );
    let lines = 0;
    let re = new RegExp( /(\S+:\S+:\S+) ([\S]+): \[([\S]+)\] (.*)/ );
    rl.on( 'line', (line) => {
      let i = line.match( re );
      if ( i ) {
        lines += 1;
        app.get( 'lineQueue' ).add({
          timestamp: i[1],
          host: 'localhost',
          program: i[2],
          level: i[3],
          message: `[${i[3]}] ${i[4]}`
        });
      }
    });
    rl.on( 'close', () => {
      console.log( 'line queue initialized, with lines:', lines );
      cb();
    });
  },
], function( err ) {
  if ( err ) {
    app.log.error( err );
    process.exit(1);
  }
    
  DBUtils = require( './db' )( app );

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  app.use(favicon());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/', routes);

  /// catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });

  app.set('port', process.env.PORT || app.config.webserver_port || 8080);

  app.listen(app.get('port'), function() {
    app.log.info( 'webserver listening on port ' + app.get( 'port' ) );
  });
});
