#!/usr/bin/env node

'use strict';

const storj = require('storj-lib');
const Logger = require('kad-logger-json');
const config = JSON.parse(JSON.stringify(require('../lib/config/farmer')));

config.keyPair = new storj.KeyPair(config.networkPrivateKey);
config.logger = new Logger(config.loggerVerbosity);
config.storageManager = new storj.StorageManager(
  new storj.EmbeddedStorageAdapter(config.storagePath),
  {
    maxCapacity: storj.utils.toNumberBytes(
      config.storageAllocationSize,
      config.storageAllocationUnit
    )
  }
);

config.logger.pipe(process.stdout);
storj.Farmer(config).join((err) => {
  if (err) {
    config.logger.error(err.message);
    process.exit(1);
  }
});
