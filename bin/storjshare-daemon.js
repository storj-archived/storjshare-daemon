#!/usr/bin/env node

'use strict';

const daemonize = require('daemon');
const dnode = require('dnode');
const config = require('../lib/config/daemon');
const RPC = require('../lib/api');
const utils = require('../lib/utils');
const api = new RPC({ logVerbosity: config.daemonLogVerbosity });
const {createWriteStream} = require('fs');
const logFile = createWriteStream(config.daemonLogFilePath, { flags: 'a' });
const storjshare_daemon = require('commander');

storjshare_daemon
  .option('--status', 'print the status of the daemon and exit')
  .option('-F, --foreground', 'keeps the process in the foreground')
  .parse(process.argv);

function startDaemonRpcServer() {
  dnode(api.methods)
    .on('error', (err) => api.logger.warn(err.message))
    .listen(config.daemonRpcPort, config.daemonRpcAddress);
}

function checkDaemonRpcStatus() {
  utils.checkDaemonRpcStatus(config.daemonRpcPort, (isRunning) => {
    console.info(`\n  * daemon ${isRunning ? 'is' : 'is not'} running`);
    process.exitCode = isRunning ? 0 : 3;
  });
}

if (storjshare_daemon.status) {
  checkDaemonRpcStatus();
} else if (!storjshare_daemon.foreground) {
  daemonize();
  api.logger.pipe(logFile);
  startDaemonRpcServer();
} else {
  api.logger.pipe(process.stdout);
  startDaemonRpcServer();
}


