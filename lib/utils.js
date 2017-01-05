'use strict';

var fs = require('fs');
var storj = require('storj-lib');
var bitcore = storj.deps.bitcore;
var du = require('du');
var diskspace = require('fd-diskspace').diskSpace;
var assert = require('assert');
var path = require('path');

/**
 * Validate the given payout address
 * @param {String} address
 */
module.exports._isValidPayoutAddress = function(address) {
  return bitcore.Address.isValid(address) ||
         bitcore.Address.isValid(address, bitcore.Networks.testnet);
};

/**
 * Validate the given dataserv directory
 * @param {String} directory
 */
module.exports._isValidDirectory = function(directory) {
  return this.existsSync(directory);
};

/**
 * Validate the given size
 * @param {String} size
 */
module.exports._isValidSize = function(size) {
  return Number(size) > 0 && typeof size !== 'undefined';
};


/**
 * Validates a given tab config
 * #validate
 * @param {Number} tabindex
 */
module.exports.validate = function(config) {
  assert(
    this._isValidPayoutAddress(config.farmerConf.paymentAddress),
    'Invalid payout address'
  );
  assert(this._isValidDirectory(config.storage.path), 'Invalid directory');
  assert(this._isValidSize(config.storage.size), 'Invalid storage size');

  if (!this.existsSync(config.storage.dataDir)) {
    fs.mkdirSync(config.storage.dataDir);
  }
  assert(
    this._isValidDirectory(config.storage.dataDir),
    'Could not create Shard Directory'
  );
};

/**
 * Validates the space being allocated exists
 * #validateAllocation
 * @param {Object} tab
 */
module.exports.validateAllocation = function(conf, callback) {
  this.getFreeSpace(conf.storage.path, function(err, free) {
    var allocatedSpace = this.manualConvert(
      { size: conf.storage.size, unit: conf.storage.unit }, 'B', 0
    );

    this.getDirectorySize(conf.storage.dataDir, function(err, usedspacebytes) {
      if(err) {
        return callback(err);
      }

      var usedspace = this.autoConvert(
        { size: usedspacebytes, unit: 'B' }, 0
      );

      conf.usedspace = usedspace;

      if(allocatedSpace.size > free + usedspacebytes) {
        return callback(new Error('Invalid storage size'));
      }
      return callback(null);
    });
  });
};

/**
 * Check if file exists
 * @param {String} file - Path to file
 */
module.exports.existsSync = function(file) {
  try {
    fs.statSync(file);
  } catch(err) {
    return !(err);
  }

  return true;
};

/**
 * Converts to a reasonable unit of bytes
 * @param {Object} bytes
 * @param {Number} precision
 */
module.exports.autoConvert = function(object, precision) {
  /*jshint maxcomplexity:10 */
  var kilobyte = 1000;
  var megabyte = kilobyte * 1000;
  var gigabyte = megabyte * 1000;
  var terabyte = gigabyte * 1000;

  var byteobject = (this.manualConvert(object, 'B'));
  var bytes = byteobject.size;

  if ((bytes >= kilobyte) && (bytes < megabyte)) {
    return this.manualConvert(byteobject, 'KB', (precision || 1));
  } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
    return this.manualConvert(byteobject, 'MB', (precision || 2));
  } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
    return this.manualConvert(byteobject, 'GB', (precision || 3));
  } else if (bytes >= terabyte) {
    return this.manualConvert(byteobject, 'TB', (precision || 4));
  }

  return byteobject;

};

/**
 * Converts units of bytes to other units
 * @param {Object} object to be converted
 * @param {String} Unit Object will be converted to
 */
module.exports.manualConvert = function(object, unit, precision) {
  var table = {
    'B': 0,
    'KB': 1,
    'MB': 2,
    'GB': 3,
    'TB': 4
  };

  precision = (!precision) ? (table[unit] ? table[unit] : 6) : precision;

  var diff = table[object.unit] - table[unit];

  if (diff < 0) {
    return {
      size: (object.size / Math.pow(1000, Math.abs(diff))).toFixed(precision),
      unit: unit
    };
  } else if (diff > 0) {
    return {
      size: (object.size * Math.pow(1000, Math.abs(diff))).toFixed(precision),
      unit: unit
    };
  } else {
    return object;
  }
};

/**
 * find the difference between two file sizes
 * @param {Object} object
 * @param {Object} object
 */
module.exports.subtract = function(object1, object2) {
  var bytes1 = this.manualConvert(object1, 'B');
  var bytes2 = this.manualConvert(object2, 'B');

  var difference = bytes1.size - bytes2.size;

  return this.autoConvert({size: difference, unit: 'B'});
};

/**
 * Recursively determines the size of a directory
 * @param {String} dir - Directory to traverse
 * @param {Function} callback
 */
module.exports.getDirectorySize = function(dir, callback) {
  du(
    dir,
    {
      filter: function(f) {
        return (
          f.indexOf('contracts.db') !== -1 ||
          f.indexOf('sharddata.kfs') !== -1
        );
      }
    },
    function (err, size) {
      callback(err,size);
    }
  );
};

/**
 * get free space on disk of path
 * @param {String} path
 */
module.exports.getFreeSpace = function(path, callback) {
  var self = this;

  if (!this.existsSync(path)) {
    return callback(null, 0);
  }

  diskspace(function(err, result) {
    /*jshint maxcomplexity:10 */
    if (err) {
      return callback(err);
    }

    var free = 0;

    for (var disk in result.disks) {
      var diskDrive = disk;

      if (process.platform === 'win32') {
        diskDrive += ':\\';
      }

      if (self.existsSync(diskDrive)) {
        if (fs.statSync(path).dev === fs.statSync(diskDrive).dev) {
          // The `df` command on linux returns KB by default, so we need to
          // convert to bytes.
          free = process.platform === 'win32' ?
                 result.disks[disk].free :
                 result.disks[disk].free * 1000;
        }
      }
    }

    return callback(null, free);
  });
};
