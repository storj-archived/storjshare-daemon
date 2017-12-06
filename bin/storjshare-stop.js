#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_stop = require('commander');

storjshare_stop
  .description('stops the running node specified')
  .option('-i, --nodeid <nodeid>', 'id of the running node')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!storjshare_stop.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (storjshare_stop.remote) {
  address = storjshare_stop.remote.split(':')[0];
  if (storjshare_stop.remote.split(':').length > 1) {
    port = parseInt(storjshare_stop.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.stop(storjshare_stop.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot stop node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${storjshare_stop.nodeid} stopped`);
    return sock.end();
  });
}, address);
