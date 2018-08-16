var nodemailer = require('nodemailer');
require('nodemailer-ses-transport');

module.exports = function( app, config ) {
  var options = config.transports[ config.transport ];
  app.log.debug( 'emailer: options:', JSON.stringify( options, null, 2 ) );
  var transporter = nodemailer.createTransport( options );

  function send( data, cb ) {
    data.from = data.from || config.from;
    app.log.debug( 'email: sending email: from:', data.from, 'to:', data.to );
    transporter.sendMail( data, function( err, info ) {
      if ( err ) {
	app.log.error( 'email: sent:', err );
	return cb( err );
      }
      if ( info ) app.log.debug( 'email: sent: info:', JSON.stringify( info, null, 2 ) );
      cb();
    });
  }

  return {
    send: send
  };
};

