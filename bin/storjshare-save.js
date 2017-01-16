#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const config = require('../lib/config/daemon');
const dnode = require('dnode');
const storjshare_save = require('commander');

storjshare_save
  .description('saves a snapshot of shares')
  .option('-s, --snapshot <path>', 'path to write the snapshot file')
  .parse(process.argv);

if (!storjshare_save.snapshot) {
  storjshare_save.snapshot = path.join(
    os.homedir(),
    '.config/storjshare/snapshot'
  );
}

if (!path.isAbsolute(storjshare_save.snapshot)) {
  storjshare_save.snapshot = path.join(process.cwd(),
                                       storjshare_save.snapshot);
}

const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.save(storjshare_save.snapshot, (err) => {
    if (err) {
      console.error(`\n  cannot save snapshot, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * snapshot ${storjshare_save.snapshot} saved`);
    sock.end();
  });
});
