#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_load = require('commander');

storjshare_load
  .description('loads a snapshot of shares and starts all of them')
  .option('-s, --snapshot <path>', 'path to load the snapshot file')
  .parse(process.argv);

if (!storjshare_load.snapshot) {
  storjshare_load.snapshot = path.join(
    os.homedir(),
    '.config/storjshare/snapshot'
  );
}

if (!path.isAbsolute(storjshare_load.snapshot)) {
  storjshare_load.snapshot = path.join(process.cwd(),
                                       storjshare_load.snapshot);
}

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  rpc.load(storjshare_load.snapshot, (err) => {
    if (err) {
      console.error(`\n  cannot load snapshot, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * snapshot ${storjshare_load.snapshot} loaded`);
    sock.end();
  });
});
