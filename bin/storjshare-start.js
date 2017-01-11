#!/usr/bin/env node

'use strict';

const storj = require('storj-lib');
const dnode = require('dnode');
const path = require('path');
const config = require('../lib/config/daemon');
const storjshare_start = require('commander');

storjshare_start
  .description('starts a new network share')
  .option('-c, --config <path>', 'specify the configuration path')
  .parse(process.argv);

if (!storjshare_start.config) {
  console.error('\n  no config file was given, try --help');
  process.exit(1);
}

const configPath = path.isAbsolute(storjshare_start.config) ?
                     path.normalize(storjshare_start.config) :
                     path.join(process.cwd(), storjshare_start.config);
const sock = dnode.connect(config.daemonRpcPort);

sock.on('remote', function(rpc) {
  rpc.start(configPath, (err) => {
    if (err) {
      console.error(`\n  failed to start share, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * starting share with config at ${configPath}`);
    sock.end();
  });
});
