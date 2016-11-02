
'use strict';

var path = require('path');
var platform = require('os').platform();
var HOME = platform !== 'win32' ? process.env.HOME : process.env.USERPROFILE;
var CONFDIR = path.join(HOME, '.storjshare');
var utils = require('./utils');
var merge = require('merge');
var fs = require('fs');

function ConfigManager(farmerId, options) {
  if (!(this instanceof ConfigManager)) {
    return new ConfigManager(farmerId, options);
  }

  this.id = farmerId;
  this.confPath = path.join(CONFDIR, 'settings.json');
  this.config = this._readConf();

  if (options) {
    this.config = merge.recursive(
      Object.create(ConfigManager.DEFAULTS),
      options.config
    );
  }

}

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
    fs.writeFileSync(this.confPath, JSON.stringify(this.toObject(), null, 2));
  } catch (err) {
    throw err;
  }
};

/**
 * Save the configuration at the given index
 */
ConfigManager.prototype.saveConfig = function(callback) {
  fs.writeFile(
    this.confPath, JSON.stringify(this.toObject(), null, 2), function(err
    ) {
      if (err) {
        return callback(err);
      }

      return callback(null);
    }
  );
};

/**
 * Returns a trimmed address
 * #getAddress
 */
ConfigManager.prototype.getAddress = function() {
  return this.address.trim();
};

ConfigManager.DEFAULTS = {
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
  key: '',
  address: '',
  storage: {
    path: '',
    dataDir: '',
    size: 0,
    unit: 'GB'
  },
  network: {
    hostname: '127.0.0.1',
    port: 0,
    seed: '',
    nat: true
  },
  tunnels: {
    numcx: 0,
    tcpPort: 0,
    startPort: 0,
    endPort: 0
  },
  connetedPeers: 0,
  telemetry: false,
  opcodes: ['0f01020202', '0f02020202', '0f03020202']
};

module.exports = ConfigManager;
