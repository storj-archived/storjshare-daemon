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
  .parse(process.argv);

function getColoredPortValue(connectionStatus, value) {
  switch (connectionStatus) {
    case 0:
      return colors.green(value);
    case 1:
      return colors.yellow(value);
    case 2:
      return colors.red(value);
    default:
      return value;
  }
}

utils.connectToDaemon(config.daemonRpcPort, function(rpc, sock) {
  rpc.status(function(err, shares) {
    let table = new Table({
      head: ['Share', 'Status', 'Uptime', 'Restarts', 'Peers',
        'Port', 'Shared'],
      style: {
        head: ['cyan', 'bold'],
        border: []
      },
      colWidths: [45, 10, 10, 10, 10, 11, 10]
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

      let portStatus = share.meta.farmerState.portStatus;
      let port = getColoredPortValue(portStatus.connectionStatus,
         portStatus.listenPort);
      let connectionType =  getColoredPortValue(portStatus.connectionStatus, 
        portStatus.connectionType);
      

      table.push([
        `${share.id}\n  → ${share.config.storagePath}`,
        status,
        prettyMs(share.meta.uptimeMs),
        share.meta.numRestarts || 0,
        share.meta.farmerState.totalPeers || 0,
        port + '\n' + connectionType,
        share.meta.farmerState.spaceUsed + '\n' +
          `(${share.meta.farmerState.percentUsed}%)`
      ]);
    });
    console.log('\n' + table.toString());
    sock.end();
  });
});