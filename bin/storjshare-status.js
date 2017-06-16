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

function portStatusInitialized(portStatus) {
  return portStatus.isPublic !== undefined
    && portStatus.uPnP !== undefined
    && portStatus.portOpen !== undefined;
}

function getPortValueColored(portStatus, value) {
  if (portStatus.portOpen) {
    return colors.green(value);
  }
  if (portStatus.tunneled) {
    return colors.yellow(value);
  }
  return colors.red(value);
}

function getPort(portStatus) {
  if (portStatusInitialized(portStatus)) {
    return getPortValueColored(portStatus,portStatus.listenPort);
  }
  return '...';
}

function getConnectionType(portStatus) {
  let connectionType = '';
  if (!portStatusInitialized(portStatus)) {
    return connectionType;
  }
  if (portStatus.portOpen) {
    connectionType = portStatus.uPnP ? '(uPnP)' : '(TCP)';
  }
  else if (portStatus.tunneled) {
    connectionType = '(Tunnel)';
  }
  else if (!portStatus.uPnP && !portStatus.isPublic) {
    connectionType = '(Private)';
  }
  else {
    connectionType = '(Closed)';
  }
  return getPortValueColored(portStatus,connectionType);
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
      colWidths: [45, 15, 10, 10, 10, 11, 10]
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

      table.push([
        `${share.id}\n  → ${share.config.storagePath}`,
        status,
        prettyMs(share.meta.uptimeMs),
        share.meta.numRestarts || 0,
        share.meta.farmerState.totalPeers || 0,
        getPort(portStatus) + '\n' + getConnectionType(portStatus),
        share.meta.farmerState.spaceUsed + '\n' +
          `(${share.meta.farmerState.percentUsed}%)`
      ]);
    });
    console.log('\n' + table.toString());
    sock.end();
  });
});