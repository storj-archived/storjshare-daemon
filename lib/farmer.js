
'use strict';

var utils = require('./utils');
var storj = require('storj-lib');
var reporter = require('./reporter');
var TelemetryReporter = require('storj-telemetry-reporter');

function Farmer(configManager, options) {
  if (!(this instanceof Farmer)) {
    return new Farmer(configManager, options);
  }

  this.configManager = configManager;

  try {
    utils.validate(configManager.config);
  } catch (err) {
    configManager.config.farmerConf.logger.error(err.message);
    process.exit();
  }
}

Farmer.prototype.start = function() {
  var self = this;
  this.prepare();

  this.farmer = new storj.FarmerInterface(this.configManager.config.farmerConf);

  this.farmer.join(function(err) {
    if (err) {
      self.configManager.config.farmerConf.logger.error(
        'failed to join network, reason: %s', err.message
      );
      process.exit();
    }
  });

  if (this.configManager.config.telemetry.enabled) {
    try {
      reporter.report(TelemetryReporter(
        this.configManager.config.telemetry.service,
        storj.KeyPair(this.configManager.config.privkey)
      ), this.configManager.config, this.farmer);
    } catch (err) {
      this.configManager.config.farmerConf.logger.error(
        'telemetry reporter failed, reason: %s', err.message
      );
    }
  }
};

Farmer.prototype.prepare = function() {
  // Make sure we set our storage manager bruh
  if (!(this.configManager.config.farmerConf.storageManager instanceof storj.StorageManager)) {
    var storageAdapter = storj.EmbeddedStorageAdapter(
      this.configManager.config.storage.dataDir
    );

    this.configManager.config.farmerConf.storageManager = storj.StorageManager(
      storageAdapter, {
        maxCapacity: storj.utils.toNumberBytes(
          this.configManager.config.storage.size,
          this.configManager.config.storage.unit
        )
      }
    );
  }
};

module.exports = Farmer;
