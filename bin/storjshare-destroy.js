#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const dnode = require('dnode');

if (!process.argv[2]) {
  console.error('\n  you must supply a node ID to destroy');
  process.exit(1);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.destroy(process.argv[2], (err) => {
    if (err) {
      console.error(`\n  cannot destroy node, reason: ${err.message}`);
      process.exit(1);
    }
    console.info(`\n  * share ${process.argv[2]} destroyed`);
    process.exit(0);
  });
});
