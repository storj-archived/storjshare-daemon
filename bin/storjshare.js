#!/usr/bin/env node

'use strict';

const storjshare = require('commander');
const {version} = require('../package');
const {software: core, protocol} = require('storj-lib').version;

storjshare
  .version(`daemon: ${version}, core: ${core}, protocol: ${protocol}`)
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
  .command('daemon', 'starts the daemon')
  .parse(process.argv);
