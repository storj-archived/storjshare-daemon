#!/usr/bin/env node

'use strict';

const daemonize = require('daemon');
const dnode = require('dnode');
const config = require('../lib/config/daemon');
const RPC = require('../lib/api');
const api = new RPC({ logVerbosity: config.daemonLogVerbosity });
const {createWriteStream} = require('fs');
const logFile = createWriteStream(config.daemonLogFilePath, { flags: 'a' });
const storjshare_daemon = require('commander');

storjshare_daemon
  .option('-F, --foreground', 'keeps the process in the foreground')
  .parse(process.argv);

if (!storjshare_daemon.foreground) {
  daemonize();
  api.logger.pipe(logFile);
} else {
  api.logger.pipe(process.stdout);
}

dnode(api.methods).listen(config.daemonRpcPort, config.daemonRpcAddress);
