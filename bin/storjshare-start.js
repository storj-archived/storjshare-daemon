#!/usr/bin/env node

'use strict';

const {spawn} = require('child_process');
const utils = require('../lib/utils');
const path = require('path');
const config = require('../lib/config/daemon');
const storjshare_start = require('commander');

storjshare_start
  .description('starts a new network node')
  .option('-c, --config <path>', 'specify the configuration path')
  .option('-d, --detached', 'run node without management from daemon')
  .option('-u, --unsafe', 'ignore system resource guards')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!storjshare_start.config) {
  console.error('\n  no config file was given, try --help');
  process.exit(1);
}

const configPath = path.isAbsolute(storjshare_start.config) ?
                     path.normalize(storjshare_start.config) :
                     path.join(process.cwd(), storjshare_start.config);

let port = config.daemonRpcPort;
let address = null;
if (storjshare_start.remote) {
  address = storjshare_start.remote.split(':')[0];
  if (storjshare_start.remote.split(':').length > 1) {
    port = parseInt(storjshare_start.remote.split(':')[1], 10);
  }
}

function runDetachedShare() {
  const scriptPath = path.join(__dirname, '../script/farmer.js');
  const shareProc = spawn(scriptPath, ['--config', configPath]);

  process.stdin.pipe(shareProc.stdin);
  shareProc.stdout.pipe(process.stdout);
  shareProc.stderr.pipe(process.stderr);
  shareProc.on('exit', (code) => process.exit(code));
}

function runManagedShare() {
  utils.connectToDaemon(port, function(rpc, sock) {
    rpc.start(configPath, (err) => {
      if (err) {
        console.error(`\n  failed to start node, reason: ${err.message}`);
        return sock.end();
      }
      console.info(`\n  * starting node with config at ${configPath}`);
      sock.end();
    }, storjshare_start.unsafe);
  }, address);
}

if (storjshare_start.detached) {
  runDetachedShare();
} else {
  runManagedShare();
}
