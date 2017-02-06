#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const storjshare = require('commander');
const {fork} = require('child_process');
const path = require('path');
const utils = require('../lib/utils');
const {version} = require('../package');
const {software: core, protocol} = require('storj-lib').version;

const TIME_WAIT_IF_STARTED = 1000;
const TIME_WAIT_AFTER_START = 6000;

storjshare
  .version(`\n  * daemon: ${version}, core: ${core}, protocol: ${protocol}`)
  .command('start', 'start a farming node')
  .command('stop', 'stop a farming node')
  .command('restart', 'restart a farming node')
  .command('status', 'check status of node(s)')
  .command('logs', 'tail the logs for a node')
  .command('create', 'create a new configuration')
  .command('save', 'snapshot the currently managed shares')
  .command('load', 'load a snapshot of previously managed shares')
  .command('destroy', 'kills the farming node')
  .command('killall', 'kills all shares and stops the daemon')
  .command('daemon', 'starts the daemon');

if (!['daemon'].includes(process.argv[2])) {
  utils.checkDaemonRpcStatus(config.daemonRpcPort, (isRunning) => {
    if (isRunning) {
      setTimeout(() => storjshare.parse(process.argv), TIME_WAIT_IF_STARTED);
    } else {
      console.info('\n  * daemon is not running, starting...');
      fork(path.join(__dirname, 'storjshare-daemon.js'), []);
      setTimeout(() => storjshare.parse(process.argv), TIME_WAIT_AFTER_START);
    }
  });
} else {
  storjshare.parse(process.argv);
}
