
'use strict';

var utils = require('./utils');
var storj = require('storj-lib');
var reporter = require('./reporter');
var Logger = require('kad-logger-json');

/**
 * Farmer instance
 * @constructor
 * @param {ConfigManager} configManager - Config for starting the farmer
 */
function Farmer(configManager, options) {
  if (!(this instanceof Farmer)) {
    return new Farmer(configManager, options);
  }

  if (!configManager) {
    throw new Error('An instance of ConfigManager must be passed in');
  }

  // Make sure config has everything we need
  utils.validate(configManager.config);

  this.configManager = configManager;
  this.prepare();
}

/**
 * Start the farmer
 */
Farmer.prototype.start = function(callback) {
  var config = this.configManager.config;
  var farmerConf = config.farmerConf;
  this.farmer = new storj.FarmerInterface(farmerConf);

  this.farmer.join(function(err) {
    if (err) {
    farmerConf.logger.error(
        'failed to join network, reason: %s', err.message
      );
      return callback(err);
    }

    // Start reporting telemetry if set to true
    if (config.telemetry.enabled) {
      try {
        reporter.start();
      } catch (err) {
        farmerConf.logger.error(
          'telemetry reporter failed, reason: %s', err.message
        );
        return callback(err);
      }
    }

    return callback(null);
  });
};

/**
 * Initialize the storageManager for farming
 */
Farmer.prototype.prepare = function() {
  var config = this.configManager.config;
  var farmerConf = config.farmerConf;
  var storageAdapter = storj.EmbeddedStorageAdapter(
    config.storage.dataDir
  );

  farmerConf.storageManager = storj.StorageManager(
    storageAdapter, {
      maxCapacity: storj.utils.toNumberBytes(
        config.storage.size,
        config.storage.unit
      )
    }
  );

  farmerConf.logger = new Logger(config.loglevel);
  farmerConf.keyPair = storj.KeyPair(config.privkey);
};

/**
 * Stop the farmer
 */
Farmer.prototype.stop = function(callback) {
  var config = this.configManager.config;
  if (!this.farmer) {
    return callback(null);
  }

  if (config.telemetry.enabled) {
    reporter.stop();
  }

  this.farmer.leave(function(err) {
    if (err) {
      return callback(err);
    }
    callback(null);
  });
};

/**
 * Restart the farmer
 */
Farmer.prototype.restart = function(callback) {
  var self = this;
  this.stop(function(err) {
    if (err) {
      return callback(err);
    }
    self.start(callback);
  });
};

module.exports = Farmer;
