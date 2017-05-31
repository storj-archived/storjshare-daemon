#!/usr/bin/env node

'use strict';

const prettyMs = require('pretty-ms');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const Table = require('cli-table');
const colors = require('colors/safe');
const storjshare_status = require('commander');
const bytes = require('bytes');

storjshare_status
  .description('prints the status of all managed shares')
  .parse(process.argv);

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  rpc.status(function(err, shares) {
    let table = new Table({
      head: ['Share', 'Status', 'Uptime', 'Restarts', 'Peers', 'Shared'],
      style: {
        head: ['cyan', 'bold'],
        border: []
      },
      colWidths: [42, 9, 10, 10, 7, 10]
    });
    var totalShares = shares.length;
    var totalUptimeMs=0;
    var totalStopped=0;
    var totalRunning=0;
    var totalErrored=0;
    var totalUnknown=0;
    var totalRestarts=0;
    var totalPeers=0;
    var totalSpaceUsed=0;
    var totalPercentUsed=0;
    shares.forEach((share) => {
      let status = '?';

      switch (share.state) {
        case 0:
          status = colors.gray('stopped');
          totalStopped++;
          break;
        case 1:
          status = colors.green('running');
          totalRunning++;
          break;
        case 2:
          status = colors.red('errored');
          totalErrored++;
          break;
        default:
          status = 'unknown';
          totalUnknown++;
      }

      totalUptimeMs += share.meta.uptimeMs;
      totalRestarts += share.meta.numRestarts || 0;
      totalPeers += share.meta.farmerState.totalPeers || 0;
      totalSpaceUsed += bytes(share.meta.farmerState.spaceUsed);
      totalPercentUsed += parseInt(share.meta.farmerState.percentUsed);
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

    if (totalShares > 1) {
      table.push([
        '     ' + 
        'Running: ' + (totalRunning + '    ').slice(0,5) + ' ' +
        `Stopped: ${totalStopped}\n     ` + 
        'Errored: ' + (totalErrored + '    ').slice(0,5) + ' ' +
        `Unknown: ${totalUnknown}`,
        'Average\nTotal',
        prettyMs(totalUptimeMs / totalShares) + '\n' + prettyMs(totalUptimeMs),
        (totalRestarts / totalShares).toFixed(0) + '\n' + totalRestarts ,
        (totalPeers / totalShares).toFixed(0) + '\n' + totalPeers,
        bytes(totalSpaceUsed / totalShares) + '\n' + bytes(totalSpaceUsed) +
        '\n(' + (totalPercentUsed / totalShares).toFixed(0) + '%)'
      ]);
    }
    console.log('\n' + table.toString());
    sock.end();
  });
});
