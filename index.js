"use strict";
//
// Tested with winston-syslog on the client side.
//
const syslogd = require( 'syslogd' );
const writer = require( './writer' );

// initialise the file writer
writer.initialize({
  location: process.env.LOG_LOCATION || '/tmp',
  maxfiles: process.env.LOG_MAX_FILES || 3,
  maxsize:  process.env.LOG_MAX_SIZE || ( 100 * 1024 * 1024 )
});

// normaize an incoming syslog message
const normalizer = (msg) => {
  let json = JSON.parse( msg.msg );
  let message = json.message; delete json.message;
  let level = json.level; delete json.level;
  let program = msg.tag.replace(/\[\d+\]/, '');
  return {
    time: msg.time.toISOString(),
    program,
    hostname: msg.hostname,
    level,
    message,
    meta: json
  };
}

// Turn the metadata into a string (if it has any properties)
const metaString = (meta) => {
  if ( Object.keys( meta ).length === 0 ) return '';
  else return JSON.stringify( meta );
}

// Syslogd message handler
const handler = (msg) => {
  let m = normalizer( msg );
  writer.write( m );
  console.log( `${m.time} ${m.program} [${m.level}] ${m.message} ${metaString(m.meta)}` );
}

let SYSLOG_PORT = process.env.SYSLOG_PORT || 514;
syslogd( handler ).listen( SYSLOG_PORT, (err) => {
  if ( err ) console.error( err );
  console.log( 'listening on', SYSLOG_PORT );
});
