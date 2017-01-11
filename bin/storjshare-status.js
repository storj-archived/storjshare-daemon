#!/usr/bin/env node

'use strict';

const prettyMs = require('pretty-ms');
const config = require('../lib/config/daemon');
const dnode = require('dnode');
const Table = require('cli-table');
const sock = dnode.connect(config.daemonRpcPort);
const colors = require('colors/safe');
const storjshare_status = require('commander');

storjshare_status
  .description('prints the status of all managed shares')
  .parse(process.argv);

sock.on('remote', function(rpc) {
  rpc.status(function(err, shares) {
    let table = new Table({
      head: ['Node ID', 'Status', 'Uptime', 'Restarts', 'Peers', '% Shared'],
      style: {
        head: ['cyan', 'bold'],
        border: []
      }
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
        share.id || '?',
        status,
        prettyMs(share.meta.uptimeMs),
        share.meta.numRestarts || 0,
        share.meta.farmerState.totalPeers || 0,
        share.meta.farmerState.percentUsed || '...'
      ]);
    });
    console.log('\n' + table.toString());
    sock.end();
  });
});
