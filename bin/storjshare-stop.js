#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_stop = require('commander');

storjshare_stop
  .description('stops the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .parse(process.argv);

if (!storjshare_stop.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  rpc.stop(storjshare_stop.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot stop node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${storjshare_stop.nodeid} stopped`);
    return sock.end();
  });
});
