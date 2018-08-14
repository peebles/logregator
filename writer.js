"use strict";

let Promise = require( 'bluebird' );
let winston = Promise.promisifyAll(require("winston"));
let mkdirp = require( 'mkdirp' );
let path = require( 'path' );
let Queue = require( 'promise-queue' );

let loggers = {};
let queue;

let MAXSIZE, MAXFILES, LOGFILES;

function initialize( config ) {
  queue = new Queue( 1, Infinity );
  MAXSIZE  = config.maxsize  || 100 * 1024 * 1024;
  MAXFILES = config.maxfiles || 3;
  LOGFILES = config.location || '/tmp';
  mkdirp.sync( LOGFILES );
  winston.remove(winston.transports.Console);
}

function write( json ) {
  queue.add( () => {
    return handler( json );
  });
}

function handler( json ) {
  let program = json.program || 'program';
  let level   = json.level || json.severity;
  let message = json.message;
  let meta    = json.meta;
  let metastring = ( (meta && Object.keys( meta ).length) ? JSON.stringify( meta ) : '' );
  let timestamp  = json.time;

  let allString = `${timestamp} ${program} [${level}] ${message} ${metastring}`;
  let prgString = `${timestamp} [${level}] ${message} ${metastring}`;

  return Promise.join(
    getLogger( 'all' ).info( allString ),
    getLogger( program ).info( prgString )
  );
}

function getLogger( name ) {
  let options = {
    maxsize: MAXSIZE,
    maxFiles: MAXFILES,
    tailable: true,
    zippedArchive: false, // https://github.com/winstonjs/winston/issues/1128 (broken!)
    colorize: false,
  };
  if ( ! loggers[ name ] ) {
    options.filename = path.join( LOGFILES, name + '.log' );
    loggers[name] = winston.createLogger({
      format: winston.format.printf( m => `${m.message}` ),
      transports: [
        new winston.transports.File( options )
      ]
    });
  }
  return loggers[ name ];
}

module.exports = {
  initialize: initialize,
  write: write
};
