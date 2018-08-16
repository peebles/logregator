"use strict";
/*
   log: a logger (ie: log.debug(), log.info(), log.error(), log.warn())
   messageQueue: an aync.queue to push parsed messages to, if ignore is false
 */
let async = require( 'async' );
let writer = require( './lib/writer' );
let net = require( 'net' );
let _ = require( 'lodash' );
const syslogd = require( 'syslogd' );

function setupProxyServers( app, messageQueue, cb ) {
  writer.initialize( app.config.logs );

  // normaize an incoming syslog message
  const normalizer = (msg) => {
    let json = JSON.parse( msg.msg );
    let message = json.message; delete json.message;
    let level = json.level; delete json.level;
    let program = msg.tag.replace(/\[\d+\]/, '');

    message = `[${level}] ${message} ${metaString(json)}`
    
    return {
      timestamp: msg.time.toISOString(),
      program,
      host: msg.hostname,
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
    try {
      let m = normalizer( msg );
      writer.write( m );
      messageQueue.push( m, function(err) {
	if ( err ) app.log.error( err );
      });
    } catch( err ) {
      app.log.error( 'Failed to handle message:', msg, err );
    }
  }

  let SYSLOG_PORT = process.env.SYSLOG_PORT || 514;
  syslogd( handler ).listen( SYSLOG_PORT, (err) => {
    if ( err ) app.log.error( err );
    app.log.info( 'syslog listening on', SYSLOG_PORT );
  });

  cb();
}

/*
   Setup the database.  The callback returns the database handle.  Uses knex.
 */
function setupDatabase( app, config, cb ) {
  let fs = require( 'fs' );
  let dbfile = config.connection.filename;
  if ( dbfile.match( /^ENV:/ ) ) {
    let envvar = dbfile.split( ':' )[1];
    let def    = dbfile.split( ':' )[2];
    dbfile = ( process.env[ envvar ] || def );
    config.connection.filename = dbfile;
  }
  if ( ! fs.existsSync( dbfile ) ) {
    let path = require( 'path' );
    let mkdirp = require( 'mkdirp' );
    mkdirp.sync( path.dirname( dbfile ) );
    var schema = [
      "create table if not exists events (id integer primary key,  name varchar(128),  regex  varchar(128) not NULL);",
      "create table if not exists users (id integer primary key,  email varchar(48) not NULL,  freq integer default 10,  sentto integer default 0,  event_id   integer,  constraint fk_users1 foreign key(event_id) references events(id) on delete cascade on update cascade);",
      "create table if not exists buffers (  id  integer primary key,  user_id    integer,  event_id   integer,  buffer     text,  count      integer default 0,  created    integer,  buffered   integer,  constraint fk_buffers1 foreign key(user_id) references users(id) on delete cascade on update cascade,  constraint fk_buffers2 foreign key(event_id) references events(id) on delete cascade on update cascade);"
    ];
  }
  config.pool = {
    afterCreate: function( conn, cb ) {
      app.log.debug( 'db connection created' );
      conn.on( 'error', function( err ) {
	app.log.error( 'Uncaught knex error:', err );
      });
    }
  };
  /*
     app.log.debug( JSON.stringify( config, null, 2 ) );
     var db = require( 'knex' )( config );
   */
  let db = require('knex')({
    client: 'sqlite3',
    connection: {
      filename: config.connection.filename
    }
  });
  if ( schema && schema.length ) {
    app.log.warn( 'creating new database into', config.connection.filename );
    async.eachSeries( schema, function( sql, cb ) {
      db.raw( sql ).then( function() {
	cb();
      }).catch( cb );
    }, function( err ) {
      if ( err ) return cb( err );
      cb( null, db );
    });
  }
  else {
    cb( null, db );
  }
}

module.exports = {
  setupDatabase: setupDatabase,
  setupProxyServers: setupProxyServers,
};
