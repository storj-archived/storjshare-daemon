#!/usr/bin/env node

'use strict';

const prettyMs = require('pretty-ms');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const Table = require('cli-table');
const colors = require('colors/safe');
const storjshare_status = require('commander');

storjshare_status
  .description('prints the status of all managed shares')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

let port = config.daemonRpcPort;
let address = null;
if (storjshare_status.remote) {
  address = storjshare_status.remote.split(':')[0];
  if (storjshare_status.remote.split(':').length > 1) {
    port = parseInt(storjshare_status.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.status(function(err, shares) {
    let table = new Table({
      head: ['Share', 'Status', 'Uptime', 'Restarts', 'Peers', 'Shared'],
      style: {
        head: ['cyan', 'bold'],
        border: []
      },
      colWidths: [45, 10, 10, 10, 10, 10]
    });
    shares.forEach((share) => {
      let status = '?';

      switch (share.state) {
        case 0:
          status = colors.gray('stopped');
          break;
        case 1:
          status = colors.green('running');
          break;
        case 2:
          status = colors.red('errored');
          break;
        default:
          status = 'unknown';
      }

      table.push([
        `${share.id}\n  → ${share.config.storagePath}`,
        status,
        prettyMs(share.meta.uptimeMs),
        share.meta.numRestarts || 0,
        share.meta.farmerState.totalPeers || 0,
        share.meta.farmerState.spaceUsed + '\n' +
          `(${share.meta.farmerState.percentUsed}%)`
      ]);
    });
    console.log('\n' + table.toString());
    sock.end();
  });
}, address);
