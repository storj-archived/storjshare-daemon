#!/usr/bin/env node

'use strict';

const utils = require('../lib/utils');
const storj = require('storj-lib');
const Logger = require('kad-logger-json');
const config = JSON.parse(JSON.stringify(require('../lib/config/farmer')));
const bytes = require('bytes');

let spaceAllocation = bytes.parse(config.storageAllocation);
let farmerState = {
  percentUsed: '...',
  spaceUsed: '...',
  totalPeers: 0,
  lastActivity: Date.now()
};

config.keyPair = new storj.KeyPair(config.networkPrivateKey);
config.logger = new Logger(config.loggerVerbosity);
config.storageManager = new storj.StorageManager(
  new storj.EmbeddedStorageAdapter(config.storagePath),
  {
    maxCapacity: spaceAllocation
  }
);

const farmer = storj.Farmer(config);

config.logger.on('log', () => farmerState.lastActivity = Date.now());
config.logger.pipe(process.stdout);
farmer.join((err) => {
  if (err) {
    config.logger.error(err.message);
    process.exit(1);
  }
});

function sendFarmerState() {
  farmerState.totalPeers = farmer.router.length;
  process.send(farmerState)
}

function updatePercentUsed() {
  utils.getDirectorySize(config.storagePath, (err, result) => {
    if (result) {
      farmerState.spaceUsed = bytes(result);
      farmerState.percentUsed = ((result / spaceAllocation) * 100).toFixed();
    }
  });
}

updatePercentUsed();
sendFarmerState();
setInterval(sendFarmerState, 10 * 1000); // Update state every 10 secs
setInterval(updatePercentUsed, 10 * 60 * 1000); // Update space every 10 mins
