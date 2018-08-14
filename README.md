# Logregator

Designed to capture logs from multiple sources (like docker containers) via syslog protocol and
write them to files.  Also merge all into a single "all.log".  The files are "log rotated" to
manage overall disk space usage.

## Usage

```sh
docker-compose up -d
```

Then use [winston-syslog](https://github.com/winstonjs/winston-syslog) in your clients and
aim it at this server.

## Viewing Logs

```sh
docker exec -it logs ls -l
docker exec -it logs cat all.log
```

## Backing Up 

See [this](https://github.com/peebles/docker-backup-to-s3) repo.

