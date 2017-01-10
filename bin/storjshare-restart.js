#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const storjshare_restart = require('commander');

storjshare_restart
  .description('restarts the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .parse(process.argv);

if (!storjshare_restart.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.restart(storjshare_restart.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot restart node, reason: ${err.message}`);
      process.exit(1);
    }
    console.info(`\n  * share ${storjshare_restart.nodeid} restarted`);
    process.exit(0);
  });
});
