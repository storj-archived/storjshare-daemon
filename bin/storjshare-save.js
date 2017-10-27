#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const storjshare_save = require('commander');

storjshare_save
  .description('saves a snapshot of nodes')
  .option('-s, --snapshot <path>', 'path to write the snapshot file')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
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

let port = config.daemonRpcPort;
let address = null;
if (storjshare_save.remote) {
  address = storjshare_save.remote.split(':')[0];
  if (storjshare_save.remote.split(':').length > 1) {
    port = parseInt(storjshare_save.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.save(storjshare_save.snapshot, (err) => {
    if (err) {
      console.error(`\n  cannot save snapshot, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * snapshot ${storjshare_save.snapshot} saved`);
    sock.end();
  });
}, address);
