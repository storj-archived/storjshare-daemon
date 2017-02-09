/**
 * @module utils
 */

'use strict';

const dnode = require('dnode');
const net = require('net');
const fs = require('fs');
const storj = require('storj-lib');
const {bitcore} = storj.deps;
const du = require('du');
const diskspace = require('fd-diskspace').diskSpace;
const assert = require('assert');
const bytes = require('bytes');

/**
 * Validate the given payout address
 * @param {String} address
 */
exports._isValidPayoutAddress = function(address) {
  return bitcore.Address.isValid(address) ||
         bitcore.Address.isValid(address, bitcore.Networks.testnet);
};

/**
 * Validate the given dataserv directory
 * @param {String} directory
 */
exports._isValidDirectory = function(directory) {
  return this.existsSync(directory);
};

/**
 * Validate the given size
 * @param {String} size
 */
exports._isValidSize = function(size) {
  return Number(size) >= 0 && typeof size !== 'undefined';
};

/**
 * Validates a given tab config
 * @param {Object} config
 */
exports.validate = function(config) {
  assert(this._isValidPayoutAddress(config.paymentAddress),
         'Invalid payout address');
  assert(this._isValidDirectory(config.storagePath), 'Invalid directory');
  assert(this._isValidSize(bytes.parse(config.storageAllocation)),
         'Invalid storage size');
  assert(this._isValidDirectory(config.storagePath),
         'Could not create Shard Directory');
};

/**
 * Validates the space being allocated exists
 * @param {Object} config
 */
exports.validateAllocation = function(conf, callback) {
  const self = this;

  self.getFreeSpace(conf.storagePath, function(err, free) {
    var allocatedSpace = bytes.parse(conf.storageAllocation);

    self.getDirectorySize(conf.storagePath, function(err, usedSpaceBytes) {
      if (err) {
        return callback(err);
      }

      if (allocatedSpace > free + usedSpaceBytes) {
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
exports.existsSync = function(file) {
  try {
    fs.statSync(file);
  } catch(err) {
    return !(err);
  }

  return true;
};

/**
 * Recursively determines the size of a directory
 * @param {String} dir - Directory to traverse
 * @param {Function} callback
 */
exports.getDirectorySize = function(dir, callback) {
  /* istanbul ignore next */
  du(dir, {
    filter: function(f) {
      return f.indexOf('contracts.db') !== -1 ||
             f.indexOf('sharddata.kfs') !== -1;
    }
  }, callback);
};

/**
 * Get free space on disk of path
 * @param {String} path
 */
/* istanbul ignore next */
exports.getFreeSpace = function(path, callback) {
  if (!exports.existsSync(path)) {
    return callback(null, 0);
  }

  diskspace(function(err, result) {
    /* jshint maxcomplexity:10 */
    if (err) {
      return callback(err);
    }

    let free = 0;

    for (let disk in result.disks) {
      let diskDrive = disk;

      /* istanbul ignore if */
      if (process.platform === 'win32') {
        diskDrive += ':\\';
      }

      if (exports.existsSync(diskDrive)) {
        if (fs.statSync(path).dev === fs.statSync(diskDrive).dev) {
          // NB: The `df` command on gnu+linux returns KB by default
          // NB: so we need to convert to bytes.
          free = process.platform === 'win32' ?
                 result.disks[disk].free :
                 result.disks[disk].free * 1000;
        }
      }
    }

    return callback(null, free);
  });
};

/**
 * Checks the status of the daemon RPC server
 * @param {Number} port
 */
exports.checkDaemonRpcStatus = function(port, callback) {
  const sock = net.connect(port);

  sock.once('error', function() {
    callback(false);
  });

  sock.once('connect', () => {
    sock.end();
    callback(true);
  });
};

/**
 * Connects to the daemon and callback with rpc
 * @param {Number} port
 * @param {Function} callback
 */
exports.connectToDaemon = function(port, callback) {
  const sock = dnode.connect(port);

  sock.on('error', function(err) {
    process.exitCode = 1;
    console.error('\n  daemon is not running, try: storjshare daemon');
  });

  sock.on('remote', (rpc) => callback(rpc, sock));
};
