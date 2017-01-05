#!/usr/bin/env node

'use strict';

const config = require('../lib/config');
const dnode = require('dnode');

if (!process.argv[2]) {
  console.error('\n  you must supply a node ID to stop');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.stop(process.argv[2], (err) => {
    if (err) {
      console.error(`\n  cannot stop node, reason: ${err.message}`);
      process.exit(1);
    }
    console.info(`\n  * share ${process.argv[2]} stopped`);
    process.exit(0);
  });
});
