'use strict';

const mkdirp = require('mkdirp');
const path = require('path');
const {homedir} = require('os');
const datadir = path.join(homedir(), '.config', 'storjshare');

mkdirp.sync(datadir);
mkdirp.sync(path.join(datadir, 'logs'));

const config = require('rc')('storjfarmer', {
  // NB: These properties are passed directly to Farmer
  paymentAddress: null,
  opcodeSubscriptions: [
    '0f01020202',
    '0f02020202',
    '0f03020202'
  ],
  maxOfferConcurrency: 3,
  bridges: [],
  seedList: [],
  rpcAddress: '127.0.0.1',
  rpcPort: 4000,
  doNotTraverseNat: true,
  maxTunnels: 3,
  maxConnections: 150,
  tunnelGatewayRange: {
    min: 4001,
    max: 4003
  },
  joinRetry: {
    times: 3,
    interval: 5000
  },
  offerBackoffLimit: 4,
  // NB: These properties are processed before given to Farmer
  networkPrivateKey: null,
  loggerVerbosity: 3,
  loggerOutputFile: null,
  storagePath: null,
  storageAllocation: '2GB'
});

if (!config.loggerOutputFile) {
  config.loggerOutputFile = path.join(homedir(),'.config/storjshare/logs');
}

module.exports = config;
