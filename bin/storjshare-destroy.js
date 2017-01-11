#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');
const storjshare_destroy = require('commander');

storjshare_destroy
  .description('stops a running share and removes it from status')
  .option('-i, --nodeid <nodeid>', 'id of the managed share')
  .parse(process.argv);

if (!storjshare_destroy.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.destroy(storjshare_destroy.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot destroy node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${storjshare_destroy.nodeid} destroyed`);
    sock.end();
  });
});
