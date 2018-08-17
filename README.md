# Logregator

1. I want to get my logs off of my containers and centralize them somewhere.
2. I want to set up search expressions that if met, will send an email to some people.
3. I want a "tail -f" web gui for these logs.
4. I still want to be able to get at physical ascii log files to grep, sed, awk, etc.
5. I never want to run out of disk space due to logging.  I want my physical logs to be rotated and compressed and thrown away when they get old.

This thing runs as a `syslog` server (on port 514/udp by default) and also runs a web server on port 8080 (by default).  
Clients can write logs via syslog protocol (I use winston-syslog) and users can view the logs in realtime via the
web server.

![UX](Cloud_Logger.png)

## Quick Start

Create a file called "./env.txt" that looks something like this:

```sh
# Basic Authentication for the web page
WEBSERVER_USER=admin
WEBSERVER_PASS=password

# logrotate variables
LOGS_MAXSIZE=104857600
LOGS_MAXFILES=3

# Email stuff
EMAIL_TRANSPORT=smtp
EMAIL_FROM=events@newco.com

# smtp
SMTP_USER=<yours>
SMTP_PASS=<yours>
SMTP_HOST=<yours>
SMTP_PORT=465
SMTP_AUTH=PLAIN
```

Then launch the container:

```sh
docker-compose up -d
```

## TCP Support

As of this writing the currently released winston-syslog is broken if you set the protocol to "tcp".  It seems to work fine if you
stick with "udp".  If you want to use tcp, then on your client:

```sh
npm install --save https://github.com/Savorylabs/winston-syslog/archive/2.0.1.tar.gz
```

That will get you someone's fork that has tcp support fixed.  In my simple tests, it seems to work.

## Backups

Wanna back up your logs to S3?  Consider [this](https://github.com/peebles/docker-backup-to-s3).  Just mount the volume "logdata"
into "/data" on that container.

## Configuration

See "./config.json" for the configuration that is possible.  Most of it involves configuring email to get notifications
of events when they occur.

## Access to Raw Files

```sh
docker exec -it logs ls -l
docker exec -it logs cat all.log
docker cp logs:/data/all.log /tmp
docker exec -it logs bash
```

## Web UX

Hopefully the UX is mostly self evident, except for:

### Lucene Exressions

Basically, the syslog messages are being parsed into JSON and internally look like this:

```javascript
{
  timestamp: "THE TIMESTAMP",
  program:   "THE PROGRAM NAME OF THE SENDER",
  host:      "THE HOSTNAME OF THE SENDER",
  level:     "SEVERITY: error, info, debug, warn, etc",
  message:   "THE MESSAGE",
  meta:      "ANY METADATA SENT WITH THE MESSAGE"
}
```

These fields are searchable in the UX using a [Lucene](https://github.com/peebles/json-lucene-like-query) syntax.  This
is very similar to how you'd search for things in Elastic Search if you've ever used that tool.  Just type your lucene 
expression in the search field to filter the messages shown.  Then you can click on the `Save Event` button to create an
event based on that search expression and send emails to people when that event occurs.


