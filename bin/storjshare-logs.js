#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const {Tail} = require('tail');
const colors = require('colors/safe');
const storjshare_logs = require('commander');
const fs = require('fs');
const path = require('path');
const FsLogger = require('fslogger');

storjshare_logs
  .description('tails the logs for the given node id')
  .option('-i, --nodeid <nodeid>', 'id of the running node')
  .option('-l, --lines <num>', 'lines back to print')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!storjshare_logs.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

function getLastLines(filename, lines, callback) {
  let chunk = '';
  let size = Math.max(0, fs.statSync(filename).size - (lines * 200));

  fs.createReadStream(filename, { start: size })
    .on('data', function(data) {
      chunk += data.toString();
    })
    .on('end', function() {
      chunk = chunk.split('\n').slice(-(lines + 1));
      chunk.pop();
      callback(chunk);
    });
}

function prettyLog(line) {
  var output = ' ';

  try {
    line = JSON.parse(line);
  } catch (err) {
    return;
  }

  switch (line.level) {
    case 'debug':
      output += colors.magenta('[ debug ] ');
      break;
    case 'info':
      output += colors.cyan('[ info  ] ');
      break;
    case 'warn':
      output += colors.yellow('[ warn  ] ');
      break;
    case 'error':
      output += colors.red('[ error ] ');
      break;
    default:
      // noop
  }

  output += colors.gray( `[ ${line.timestamp} ]\n [ `);
  output += `${line.message}`;
  console.log(output);
}

let port = config.daemonRpcPort;
let address = null;
if (storjshare_logs.remote) {
  address = storjshare_logs.remote.split(':')[0];
  if (storjshare_logs.remote.split(':').length > 1) {
    port = parseInt(storjshare_logs.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  process.on('exit', () => {
    sock.end();
    process.exit(0);
  });

  rpc.status((err, shares) => {
    if (err) {
      console.error(`\n  cannot get status, reason: ${err.message}`);
      return sock.end();
    }

    let logFileDir = null;

    for (let i = 0; i < shares.length; i++) {
      if (shares[i].id === storjshare_logs.nodeid) {
        logFileDir = shares[i].config.loggerOutputFile;
        break;
      }
    }

    try {
      if (!fs.statSync(logFileDir).isDirectory()) {
        logFileDir = path.dirname(logFileDir);
      }
    } catch (err) {
      logFileDir = path.dirname(logFileDir);
    }

    const fslogger = new FsLogger(logFileDir, storjshare_logs.nodeid);

    let currentFile = null;
    let logTail = null;

    setInterval(function() {
      if (currentFile !== fslogger._todaysFile()) {
        if (logTail instanceof Tail) {
          logTail.unwatch();
        }

        currentFile = fslogger._todaysFile();
        if (!utils.existsSync(fslogger._todaysFile())) {
          console.error(`\n  no logs to show for ${storjshare_logs.nodeid}`);
          return sock.end();
        }

        logTail = new Tail(fslogger._todaysFile());
        let numLines = storjshare_logs.lines
                     ? parseInt(storjshare_logs.lines)
                     : 20;

        getLastLines(fslogger._todaysFile(), numLines, (lines) => {
          lines.forEach((line) => prettyLog(line));
          logTail.on('line', (line) => prettyLog(line));
        });
      }

    }, 1000);

  });
}, address);
