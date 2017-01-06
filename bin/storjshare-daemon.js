#!/usr/bin/env node

'use strict';

const daemonize = require('daemon');
const dnode = require('dnode');
const config = require('../lib/config/daemon');
const RPC = require('../lib/api');
const api = new RPC({ logVerbosity: config.daemonLogVerbosity });
const {createWriteStream} = require('fs');

daemonize();
api.logger.pipe(createWriteStream(config.daemonLogFilePath, { flags: 'a' }));
dnode(api.methods).listen(config.daemonRpcPort, config.daemonRpcAddress);
