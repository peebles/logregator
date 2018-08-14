"use strict";
const winston = require('winston');

//
// Requiring `winston-syslog` will expose
// `winston.transports.Syslog`
//
require('winston-syslog').Syslog;

let options = {
  handleExceptions: true,
  humanReadableUnhandledException: true,

  host: '192.168.99.100',
  port: 514,
  protocol: 'udp4',
  localhost: 'mylocalhost',
  app_name: 'myappname'
};

winston.add(new winston.transports.Syslog(options));

winston.info( 'This is a message', { with: "metadata" } );
winston.error( 'This is an ERRPR' );

let foo = bar;

setTimeout( () => {
  process.exit(1);
}, 500 );
