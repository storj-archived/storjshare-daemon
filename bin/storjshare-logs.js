#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const utils = require('../lib/utils');
const {Tail} = require('tail');
const colors = require('colors/safe');
const storjshare_logs = require('commander');
const fs = require('fs');

storjshare_logs
  .description('tails the logs for the given share id')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .option('-l, --lines <num>', 'lines back to print')
  .parse(process.argv);

if (!storjshare_logs.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.status((err, shares) => {
    if (err) {
      console.error(`\n  cannot get status, reason: ${err.message}`);
      process.exit(1);
    }

    let logFilePath = null;

    for (let i = 0; i < shares.length; i++) {
      if (shares[i].id === storjshare_logs.nodeid) {
        logFilePath = shares[i].config.loggerOutputFile;
        break;
      }
    }

    if (!utils.existsSync(logFilePath)) {
      console.error(`\n  no logs to show for ${storjshare_logs.nodeid}`);
      process.exit(0);
    }

    let logTail = new Tail(logFilePath);

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

      output += colors.gray( `[ ${line.timestamp} ]\n [ `)
      output += `${line.message}`;
      console.log(output);
    }

    let numLines = storjshare_logs.lines ?
                   parseInt(storjshare_logs.lines) :
                   20;

    getLastLines(logFilePath, numLines, (lines) => {
      lines.forEach((line) => prettyLog(line));
      logTail.on('line', (line) => prettyLog(line));
    });
  });
});
