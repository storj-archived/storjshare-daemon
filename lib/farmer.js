
'use strict';

var utils = require('./utils');
var storj = require('storj-lib');
var reporter = require('./reporter');
var TelemetryReporter = require('storj-telemetry-reporter');

/**
 * Farmer instance
 * @constructor
 * @param {ConfigManager} configManager - Config for starting the farmer
 */
function Farmer(configManager, options) {
  if (!(this instanceof Farmer)) {
    return new Farmer(configManager, options);
  }

  this.configManager = configManager;

  try {
    // Make sure config has everything we need
    utils.validate(configManager.config);
  } catch (err) {
    throw err;
  }
}

/**
 * Start the farmer
 */
Farmer.prototype.start = function(callback) {
  var config = this.configManager.config;
  var farmerConf = config.farmerConf;
  this.prepare();

  if (farmerConf.logger && config.pipe) {
    farmerConf.logger.pipe(process.stdout);
  }

  this.farmer = new storj.FarmerInterface(farmerConf);

  this.farmer.join(function(err) {
    if (err) {
    farmerConf.logger.error(
        'failed to join network, reason: %s', err.message
      );
      return callback(err);
    }
  });

  // Start reporting telemetry if set to true
  if (config.telemetry.enabled) {
    try {
      reporter.report(TelemetryReporter(
      config.telemetry.service,
        storj.KeyPair(config.privkey)
      ), config, this.farmer);
    } catch (err) {
      farmerConf.logger.error(
        'telemetry reporter failed, reason: %s', err.message
      );
      return callback(err);
    }
  }

  return callback(null);
};

/**
 * Initialize the storageManager for farming
 */
Farmer.prototype.prepare = function() {
  var config = this.configManager.config;
  var farmerConf = config.farmerConf;
  // Make sure we set our storage manager bruh
  if (!(farmerConf.storageManager instanceof storj.StorageManager)) {
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
  }
};

/**
 * Stop the farmer
 */
Farmer.prototype.stop = function(callback) {
  var config = this.configManager.config;
  if (!this.farmer) {
    callback(null);
  }

  if (config.telemetry.enabled) {
    this.stopReportingTelemetry();
  }

  this.farmer.farmer().leave(function(err) {
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
      return callback(err)
    }
    self.start(callback);
  });
};

module.exports = Farmer;
