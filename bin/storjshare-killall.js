#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_killall = require('commander');

storjshare_killall
  .description('destroys all running shares and stop daemon')
  .parse(process.argv);

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  sock.on('end', () => console.info('\n  * daemon has stopped'));
  rpc.killall(() => sock.end());
});
