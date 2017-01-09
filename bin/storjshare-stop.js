#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const storjshare_stop = require('commander');

storjshare_stop
  .description('stops the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .parse(process.argv);

if (!storjshare_stop.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.stop(storjshare_stop.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot stop node, reason: ${err.message}`);
      process.exit(1);
    }
    console.info(`\n  * share ${storjshare_stop.nodeid} stopped`);
    process.exit(0);
  });
});
