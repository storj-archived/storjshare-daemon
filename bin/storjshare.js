#!/usr/bin/env node

'use strict';

const storjshare = require('commander');
const {version, bin} = require('../package');
const {software: core, protocol} = require('storj-lib').version;

function checkIfValidSubcommand() {
  if (process.argv.length > 2) {
    for (var prop in bin) {
      if (bin[prop].replace('bin/storjshare-','')
        .replace('.js','') === process.argv[2]) {
        return true;
      }
    }
  }
  return false;
}

storjshare
  .version(`daemon: ${version}, core: ${core}, protocol: ${protocol}`)
  .command('start', 'start a farming node')
  .command('stop', 'stop a farming node')
  .command('restart', 'restart a farming node')
  .command('status', 'check status of node(s)')
  .command('logs', 'tail the logs for a node')
  .command('create', 'create a new configuration')
  .command('save', 'snapshot the currently managed node')
  .command('load', 'load a snapshot of previously managed nodes')
  .command('destroy', 'kills the farming node')
  .command('killall', 'kills all nodes and stops the daemon')
  .command('daemon', 'starts the daemon')
  .parse(process.argv);

if (!checkIfValidSubcommand()) { 
  storjshare.help(); 
} 
