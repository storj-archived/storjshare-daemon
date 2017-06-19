#!/usr/bin/env node

'use strict';

const utils = require('../lib/utils');
const storj = require('storj-lib');
const Logger = require('kad-logger-json');
const Telemetry = require('storj-telemetry-reporter');
const config = JSON.parse(JSON.stringify(require('../lib/config/farmer')));
const bytes = require('bytes');
const processIsManaged = typeof process.send === 'function';

let spaceAllocation = bytes.parse(config.storageAllocation);
let farmerState = {
  percentUsed: '...',
  spaceUsed: '...',
  totalPeers: 0,
  lastActivity: Date.now()
};

config.keyPair = new storj.KeyPair(config.networkPrivateKey);
config.logger = new Logger(config.loggerVerbosity);
config.maxShardSize = config.maxShardSize ? bytes.parse(config.maxShardSize) : null;
config.storageManager = new storj.StorageManager(
  new storj.EmbeddedStorageAdapter(config.storagePath),
  {
    maxCapacity: spaceAllocation,
    logger: config.logger
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
  process.send(farmerState);
}

function updatePercentUsed() {
  config.storageManager._storage.size((err, result) => {
    if (result) {
      farmerState.spaceUsed = bytes(result);
      farmerState.spaceUsedBytes = result;
      farmerState.percentUsed = ((result / spaceAllocation) * 100).toFixed();
    }
  });
}

function sendTelemetryReport() {
  let telemetryServer = 'https://status.storj.io';
  let telemetry = new Telemetry(telemetryServer, config.keyPair);
  let report = {
    storageAllocated: spaceAllocation,
    storageUsed: bytes.parse(farmerState.spaceUsed),
    contactNodeId: config.keyPair.getNodeID(),
    paymentAddress: config.paymentAddress
  };
  telemetry.send(report, (err) => {
    if (err) {
      return config.logger.warn('telemetry report rejected, reason: %s',
                                err.message);
    }
    config.logger.info('telemetry report delivered to %s: %j', telemetryServer,
                       report);
  });
}

updatePercentUsed();
setInterval(updatePercentUsed, 10 * 60 * 1000); // Update space every 10 mins

if (processIsManaged) {
  sendFarmerState();
  setInterval(sendFarmerState, 10 * 1000); // Update state every 10 secs
}

if (config.enableTelemetryReporting) {
  setInterval(sendTelemetryReport, 10 * 60 * 1000);
}
