#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_restart = require('commander');

storjshare_restart
  .description('restarts the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .option('-a, --all', 'restart all running shares')
  .parse(process.argv);

if (!storjshare_restart.nodeid && !storjshare_restart.all) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  if (storjshare_restart.all) {
    console.info('\n  * restarting all managed shares');
  }

  rpc.restart(storjshare_restart.nodeid || '*', (err) => {
    if (err) {
      console.error(`\n  cannot restart node, reason: ${err.message}`);
      return sock.end();
    }

    if (storjshare_restart.nodeid) {
      console.info(`\n  * share ${storjshare_restart.nodeid} restarted`);
    } else {
      console.info('\n  * all shares restarted successfully');
    }

    sock.end();
  });
});
