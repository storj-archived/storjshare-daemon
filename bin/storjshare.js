#!/usr/bin/env node

'use strict';

const net = require('net');
const config = require('../lib/config/daemon');
const storjshare = require('commander');
const {fork} = require('child_process');
const path = require('path');

storjshare
  .version(require('../package').version)
  .command('start', 'start a farming node')
  .command('stop', 'stop a farming node')
  .command('restart', 'restart a farming node')
  .command('status', 'check status of node(s)')
  .command('logs', 'tail the logs for a node')
  .command('create', 'create a new configuration')
  .command('destroy', 'kills the farming node')
  .command('killall', 'kills all shares and stops the daemon')
  .command('daemon', 'starts the daemon');

if (!['daemon'].includes(process.argv[2])) {
  const sock = net.connect(config.daemonRpcPort);

  sock.once('error', function() {
    console.info('\n  * daemon is not running, starting...');
    fork(path.join(__dirname, 'storjshare-daemon.js'), []);
    setTimeout(() => storjshare.parse(process.argv), 4000);
  });

  sock.once('connect', function() {
    sock.end();
    setTimeout(() => storjshare.parse(process.argv), 1000);
  });
} else {
  storjshare.parse(process.argv);
}
