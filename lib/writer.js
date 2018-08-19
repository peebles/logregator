"use strict";

let async = require( 'async' );
let sprintf = require( 'sprintf-js' ).sprintf;
let winston = require( 'winston' );
let mkdirp = require( 'mkdirp' );
let path = require( 'path' );

let loggers = {};
let queue;

let MAXSIZE, MAXFILES, LOGFILES;

function initialize( config ) {
  queue = async.queue( handler, 1 );
  MAXSIZE  = config.maxsize  || 100 * 1024 * 1024;
  MAXFILES = config.maxfiles || 3;
  LOGFILES = config.location || '/tmp';
  mkdirp.sync( LOGFILES );
  winston.remove(winston.transports.Console);
}

function write( json ) {
  queue.push( json, function( err ) {
    if ( err ) console.log( err );
  });
}

function handler( json, cb ) {
  let program = json.program || 'program';
  let level   = json.level || json.severity;
  let message = json.message;
  let meta    = json.meta;
  let timestamp  = json[ 'timestamp' ] || new Date().toString();

  let allString = sprintf( "%s %s: %s", timestamp, program, message );
  let prgString = sprintf( "%s %s", timestamp, message );

  async.parallel([
    function( cb ) {
      getLogger( 'all' ).info( allString, cb );
    },
    function( cb ) {
      getLogger( program ).info( prgString, cb );
    }
  ], cb );
}

function getLogger( name ) {
  let options = {
    timestamp: false,
    maxsize: MAXSIZE,
    maxFiles: MAXFILES,
    json: false,
    showLevel: false,
    tailable: true,
    zippedArchive: true,
    colorize: false,
  };
  if ( ! loggers[ name ] ) {
    options.filename = path.join( LOGFILES, name + '.log' );
    winston.loggers.add( name, { file: options } );
    let logger = winston.loggers.get( name );
    logger.remove(winston.transports.Console);
    loggers[ name ] = logger;
  }
  return loggers[ name ];
}

module.exports = {
  initialize: initialize,
  write: write
};
