
'use strict';

var path = require('path');
var platform = require('os').platform();
var HOME = platform !== 'win32' ? process.env.HOME : process.env.USERPROFILE;
var CONFDIR = path.join(HOME, '.storjshare');
var utils = require('./utils');
var merge = require('merge');
var fs = require('fs');
var storj = require('storj-lib');

/**
 * Config Manager
 * @constructor
 * @param {String} farmerId - farmers unique identifier
 * @param {Object} config - Optional config with params for the farmer
 * @param {Object} config.farmerConf -
 * @param {Object} config.telemetry -
 * @param {Integer} config.loglevel -
 * @param {Object} config.storage - storage config for farmer
 *
 */
function ConfigManager(farmerId, config) {
  if (!(this instanceof ConfigManager)) {
    return new ConfigManager(farmerId, config);
  }

  this.id = farmerId;
  this.confPath = path.join(CONFDIR, farmerId+'-settings.json');
  this.config = this._readConf();

  if (config) {
    this.config = merge.recursive(
      Object.create(ConfigManager.DEFAULTS),
      config
    );
  }

}

/**
 * Load config from filesystem based on this.ConfPath
 */
ConfigManager.prototype._readConf = function() {
  var self = this;
  var parsed;
  if (!utils.existsSync(this.confPath)) {
    fs.writeFileSync(this.confPath, JSON.stringify(ConfigManager.DEFAULTS));
  }

  try {
    parsed = JSON.parse(fs.readFileSync(self.confPath).toString());
  } catch (err) {
    throw err;
  }

  return merge.recursive(Object.create(ConfigManager.DEFAULTS), parsed);
};

/**
 * Save the configuration at the given index
 */
ConfigManager.prototype.saveConfigSync = function() {
  try {
    fs.writeFileSync(this.confPath, JSON.stringify(this.config, null, 2));
  } catch (err) {
    throw err;
  }
};

/**
 * Save the configuration at the given index
 */
ConfigManager.prototype.saveConfig = function(callback) {
  fs.writeFile(
    this.confPath, JSON.stringify(this.config, null, 2), function(err
    ) {
      if (err) {
        return callback(err);
      }

      return callback(null);
    }
  );
};

/**
 * Save the configuration at the given index
 */
ConfigManager.prototype.updateConfig = function(config) {
  this.config = merge.recursive(Object.create(this._readConf()), config);
};

/**
 * Returns a trimmed address
 */
ConfigManager.prototype.getAddress = function() {
  return this.farmerConf.paymentAddress.trim();
};

ConfigManager.DEFAULTS = {
  farmerConf: {
    keyPair: null, // Instance of KeyPair
    paymentAddress: '',
    storageManager: {}, // Instance of StorageManager
    rpcAddress: '127.0.0.1',
    maxOfferConcurrency: storj.FarmerInterface.DEFAULTS.maxOfferConcurrency,
    rpcPort: 0,
    maxConnections: storj.Network.DEFAULTS.maxConnections,
    seedList: [],
    renterWhitelist: [],
    doNotTraverseNat: true,
    logger: {}, // Instance of a logger
    tunnelServerPort: 0,
    maxTunnels: 0,
    tunnelGatewayRange: {
      max: 0,
      min: 0
    },
    opcodeSubscriptions: storj.FarmerInterface.DEFAULTS.opcodeSubscriptions
  },
  contracts: {
    total: 0
  },
  usedspace: {
    size: 0,
    unit: 'B'
  },
  remainingspace: {
    size: 0,
    unit: 'B'
  },
  connectedPeers: 0,
  telemetry: {
    service: 'https://status.storj.io',
    enabled: false
  },
  loglevel: 0,
  storage: {
    path: '',
    dataDir: '',
    size: 0,
    unit: 'GB'
  },
  pipe: process.stdout
};

module.exports = ConfigManager;
