#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const utils = require('../lib/utils');
const {Tail} = require('tail');
const colors = require('colors/safe');

if (!process.argv[2]) {
  console.error('\n  you must supply a node ID to stream logs');
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
      if (shares[i].id === process.argv[2]) {
        logFilePath = shares[i].config.loggerOutputFile;
        break;
      }
    }

    if (!utils.existsSync(logFilePath)) {
      console.error(`\n  no logs to show for ${process.argv[2]}`);
      process.exit(0);
    }

    let logTail = new Tail(logFilePath);

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

    utils.getLastLines(logFilePath, 20, (lines) => {
      lines.forEach((line) => prettyLog(line));
      logTail.on('line', (line) => prettyLog(line));
    });
  });
});
