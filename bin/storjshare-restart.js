#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_restart = require('commander');

storjshare_restart
  .description('restarts the running node specified')
  .option('-i, --nodeid <nodeid>', 'id of the running node')
  .option('-a, --all', 'restart all running nodes')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!storjshare_restart.nodeid && !storjshare_restart.all) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (storjshare_restart.remote) {
  address = storjshare_restart.remote.split(':')[0];
  if (storjshare_restart.remote.split(':').length > 1) {
    port = parseInt(storjshare_restart.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  if (storjshare_restart.all) {
    console.info('\n  * restarting all managed nodes');
  }

  rpc.restart(storjshare_restart.nodeid || '*', (err) => {
    if (err) {
      console.error(`\n  cannot restart node, reason: ${err.message}`);
      return sock.end();
    }

    if (storjshare_restart.nodeid) {
      console.info(`\n  * share ${storjshare_restart.nodeid} restarted`);
    } else {
      console.info('\n  * all nodes restarted successfully');
    }

    sock.end();
  });
}, address);
