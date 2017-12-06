#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_destroy = require('commander');

storjshare_destroy
  .description('stops a running node and removes it from status')
  .option('-i, --nodeid <nodeid>', 'id of the managed node')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!storjshare_destroy.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (storjshare_destroy.remote) {
  address = storjshare_destroy.remote.split(':')[0];
  if (storjshare_destroy.remote.split(':').length > 1) {
    port = parseInt(storjshare_destroy.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.destroy(storjshare_destroy.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot destroy node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${storjshare_destroy.nodeid} destroyed`);
    sock.end();
  });
}, address);
