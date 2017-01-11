#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const storjshare_killall = require('commander');

storjshare_killall
  .description('destroys all running shares and stop daemon')
  .parse(process.argv);

const sock = dnode.connect(config.daemonRpcPort);

sock.on('end', function() {
  console.info('\n  * daemon has stopped');
});

sock.on('remote', function(rpc) {
  rpc.killall(() => sock.end());
});
