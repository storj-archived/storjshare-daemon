#!/usr/bin/env node

'use strict';

const net = require('net');
const config = require('../lib/config');
const storjshare = require('commander');
const {spawn} = require('child_process');
const path = require('path');

storjshare
  .version(require('../package').version)
  .command('start <config>', 'start a farming node')
  .command('stop <nodeid>', 'stop a farming node')
  .command('restart <nodeid>', 'restart a farming node')
  .command('status [nodeid]', 'check status of node(s)', { isDefault: true })
  .command('logs <nodeid>', 'tail the logs for a node')
  .command('destroy <nodeid>', 'kills the farming node')
  .command('killall', 'kills all shares and stops the daemon');

const sock = net.connect(config.daemonRpcPort);

sock.once('error', function() {
  console.info('\n  * daemon is not running, starting...');
  spawn(path.join(__dirname, 'storjshare-daemon.js'), [], { detached: true });
  setTimeout(() => storjshare.parse(process.argv), 500);
});

sock.once('connect', function() {
  sock.end();
  setTimeout(() => storjshare.parse(process.argv), 500);
});
