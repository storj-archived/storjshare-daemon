#!/usr/bin/env node

'use strict';

const daemonize = require('daemon');
const dnode = require('dnode');
const RPC = require('../lib/api');
const utils = require('../lib/utils');
const config = require('../lib/config/daemon');
const { createWriteStream } = require('fs');
const logFile = createWriteStream(config.daemonLogFilePath, { flags: 'a' });
const storjshare_daemon = require('commander');

storjshare_daemon
  .option('--status', 'print the status of the daemon and exit')
  .option('-F, --foreground', 'keeps the process in the foreground')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon ' +
    'to connect to when using --status')
  .parse(process.argv);

const api = new RPC({
  logVerbosity: config.daemonLogVerbosity
});

function startDaemonRpcServer() {
  dnode(api.methods)
    .on('error', (err) => api.jsonlogger.warn(err.message))
    .listen(config.daemonRpcPort, config.daemonRpcAddress);
}

let port = config.daemonRpcPort;
let address = null;
if (storjshare_daemon.remote) {
  address = storjshare_daemon.remote.split(':')[0];
  if (storjshare_daemon.remote.split(':').length > 1) {
    port = parseInt(storjshare_daemon.remote.split(':')[1], 10);
  }
}

utils.checkDaemonRpcStatus(port, (isRunning) => {
  if (storjshare_daemon.status) {
    console.info(`\n  * daemon ${isRunning ? 'is' : 'is not'} running`);
    process.exitCode = isRunning ? 0 : 3;
  } else if (isRunning) {
      return console.info('\n  * daemon is already running');
  } else {
    if (storjshare_daemon.foreground) {
      console.info('\n  * starting daemon in foreground\n');
      api.jsonlogger.pipe(process.stdout);
      startDaemonRpcServer();
    } else {
      console.info('\n  * starting daemon in background');
      daemonize();
      api.jsonlogger.pipe(logFile);
      startDaemonRpcServer();
    }
  }
}, address);
