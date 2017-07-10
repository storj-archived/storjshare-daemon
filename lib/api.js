'use strict';

const async = require('async');
const fs = require('fs');
const {statSync, readFileSync} = require('fs');
const stripJsonComments = require('strip-json-comments');
const FsLogger = require('fslogger');
const JsonLogger = require('kad-logger-json');
const {fork} = require('child_process');
const utils = require('./utils');
const path = require('path');
const { cpus } = require('os');
const {homedir} = require('os');

/** Class representing a local RPC API's handlers */
class RPC {

  /**
   * Creates a environment to manage share processes
   * @param {Object} options
   * @param {Number} options.logVerbosity
   */
  constructor(options={}) {
    this.jsonlogger = new JsonLogger(options.logVerbosity);
    this.shares = new Map();
  }

  /**
   * Logs the message by pushing it out the stream
   * @param {String} message
   * @param {String} level
   */
  _log(msg, level='info') {
    this.jsonlogger[level](msg);
  }

  /**
   * Handles IPC messages from a running share
   * @private
   */
  _processShareIpc(share, msg) {
    // NB: We receive a complete state object from shares when an event
    // NB: occurs that updates the state object
    share.meta.farmerState = msg;
  }

  /**
   * Reads the config file and returns the parsed version
   * @private
   */
  _readConfig(configPath) {
    let config = null;

    try {
      statSync(configPath);
    } catch (err) {
      throw new Error(`failed to read config at ${configPath}`);
    }

    try {
      config = JSON.parse(stripJsonComments(
        readFileSync(configPath).toString()
      ));
    } catch (err) {
      throw new Error(`failed to parse config at ${configPath}`);
    }

    try {
      utils.validate(config);
    } catch (err) {
      throw new Error(err.message.toLowerCase());
    }

    return config;
  }

  /**
   * Starts a share process with the given configuration
   * @param {String} configPath
   * @param {Boolean} unsafeFlag
   * @param {RPC~startCallback}
   * @see https://storj.github.io/core/FarmerInterface.html
   */
  start(configPath, callback, unsafeFlag=false) {
    /*jshint maxcomplexity:7 */
    let config = null;

    if (this.running >= cpus().length && !unsafeFlag) {
      return callback(new Error('insufficient system resources available'));
    }

    try {
      config = this._readConfig(configPath);
    } catch (err) {
      return callback(err);
    }

    const nodeId = utils.getNodeID(config.networkPrivateKey);
    if (nodeId === null) {
      return callback(new Error('Invalid Private Key'));
    }

    const share = this.shares.get(nodeId) || {
      config: config,
      meta: {
        uptimeMs: 0,
        farmerState: {},
        numRestarts: 0
      },
      process: null,
      readyState: 0,
      path: configPath
    };

    this._log(`attempting to start share with config at path ${configPath}`);

    if (this.shares.has(nodeId) && this.shares.get(nodeId).readyState === 1) {
      return callback(new Error(`share ${nodeId} is already running`));
    }

    if (!share.config.storageAllocation.match(/[0-9]+(T|M|G|K)?B/g)) {
      return callback(
        new Error('Invalid Storage size specified: '+
                  share.config.storageAllocation
        )
      );
    }

    utils.validateAllocation(share.config, (err) => {
      if (err) {
        return callback(new Error(err.message.toLowerCase()));
      }

      share.meta.uptimeMs = 0;
      /* istanbul ignore next */
      let uptimeCounter = setInterval(() => share.meta.uptimeMs += 1000, 1000);

      // NB: Fork the actual farmer process, passing it the configuration
      share.process = fork(
        path.join(__dirname, '../script/farmer.js'),
        ['--config', configPath],
        {
          stdio: [0, 'pipe', 'pipe', 'ipc']
        }
      );
      share.readyState = RPC.SHARE_STARTED;

      let loggerOutputFile = !share.config.loggerOutputFile
        ? path.join(homedir(), '.config/storjshare/logs')
        : share.config.loggerOutputFile;

      try {
        if (!fs.statSync(loggerOutputFile).isDirectory()) {
          loggerOutputFile = path.dirname(loggerOutputFile);
        }
      } catch (err) {
        loggerOutputFile = path.dirname(loggerOutputFile);
      }

      const fslogger = new FsLogger(loggerOutputFile, nodeId);

      fslogger.setLogLevel(config.logVerbosity);

      share.process.stderr.on('data', function(data) {
        fslogger.write(data);
      });

      share.process.stdout.on('data', function(data) {
        fslogger.write(data);
      });

      // NB: Listen for state changes to update the share's record
      share.process.on('error', (err) => {
        share.readyState = RPC.SHARE_ERRORED;
        this._log(err.message, 'error');
        clearInterval(uptimeCounter);
      });

      // NB: Listen for exits and restart the share if not stopped manually
      share.process.on('exit', (code, signal) => {
        let maxRestartsReached = share.meta.numRestarts >= RPC.MAX_RESTARTS;
        share.readyState = RPC.SHARE_STOPPED;

        this._log(`share ${nodeId} exited with code ${code}`);
        clearInterval(uptimeCounter);

        if (signal !== 'SIGINT' &&
          !maxRestartsReached &&
          share.meta.uptimeMs >= 5000
        ) {
          share.meta.numRestarts++;
          this.restart(nodeId, () => null);
        }
      });

      share.process.on('message', (msg) => this._processShareIpc(share, msg));
      this.shares.set(nodeId, share);
      callback(null);
    });
   }
  /**
   * @callback RPC~startCallback
   * @param {Error|null} error
   */

  /**
   * Stops the share process for the given node ID
   * @param {String} nodeId
   * @param {RPC~stopCallback}
   */
  stop(nodeId, callback) {
    this._log(`attempting to stop share with node id ${nodeId}`);

    if (!this.shares.has(nodeId) || !this.shares.get(nodeId).readyState) {
      return callback(new Error(`share ${nodeId} is not running`));
    }

    this.shares.get(nodeId).process.kill('SIGINT');
    setTimeout(() => callback(null), 1000);
  }
  /**
   * @callback RPC~stopCallback
   * @param {Error|null} error
   */

  /**
   * Restarts the share process for the given node ID
   * @param {String} nodeId
   * @param {RPC~restartCallback}
   */
  restart(nodeId, callback) {
    this._log(`attempting to restart share with node id ${nodeId}`);

    if (nodeId === '*') {
      return async.eachSeries(
        this.shares.keys(),
        (nodeId, next) => this.restart(nodeId, next),
        callback
      );
    }

    this.stop(nodeId, () => {
      this.start(this.shares.get(nodeId).path, callback);
    });
  }
  /**
   * @callback RPC~restartCallback
   * @param {Error|null} error
   */

  /**
   * Returns status information about the running shares
   * @param {RPC~statusCallback}
   */
  status(callback) {
    const statuses = [];

    this._log(`got status query`);
    this.shares.forEach((share, nodeId) => {
      statuses.push({
        id: nodeId,
        config: share.config,
        state: share.readyState,
        meta: share.meta,
        path: share.path
      });
    });

    callback(null, statuses);
  }
  /**
   * @callback RPC~statusCallback
   * @param {Error|null} error
   * @param {Object} status
   */

  /**
   * Simply kills the daemon and all managed proccesses
   */
  killall(callback) {
    this._log(`received kill signal, destroying running shares`);

    for (let nodeId of this.shares.keys()) {
      this.destroy(nodeId, () => null);
    }

    callback();
    setTimeout(() => process.exit(0), 1000);
  }

  /**
   * Kills the share with the given node ID
   * @param {String} nodeId
   * @param {RPC~destroyCallback}
   */
  destroy(nodeId, callback) {
    this._log(`received destroy command for ${nodeId}`);

    if (!this.shares.has(nodeId) || !this.shares.get(nodeId).process) {
      return callback(new Error(`share ${nodeId} is not running`));
    }

    let share = this.shares.get(nodeId);

    share.process.kill('SIGINT');
    this.shares.delete(nodeId);
    callback(null);
  }
  /**
   * @callback RPC~destroyCallback
   * @param {Error|null} error
   */

  /**
   * Saves the current shares configured
   * @param {String} writePath
   * @param {RPC~saveCallback}
   */
  save(writePath, callback) {
    const snapshot = [];

    this.shares.forEach((val, nodeId) => {
      snapshot.push({
        path: val.path,
        id: nodeId
      });
    });

    fs.writeFile(writePath, JSON.stringify(snapshot, null, 2), (err) => {
      if (err) {
        return callback(
          new Error(`failed to write snapshot, reason: ${err.message}`)
        );
      }

      callback(null);
    });
  }
  /**
   * @callback RPC~saveCallback
   * @param {Error|null} error
   */

  /**
   * Loads a state snapshot file
   * @param {String} readPath
   * @param {RPC~loadCallback}
   */
  load(readPath, callback) {
    fs.readFile(readPath, (err, buffer) => {
      if (err) {
        return callback(
          new Error(`failed to read snapshot, reason: ${err.message}`)
        );
      }

      let snapshot = null;

      try {
        snapshot = JSON.parse(buffer.toString());
      } catch (err) {
        return callback(new Error('failed to parse snapshot'));
      }

      async.eachLimit(snapshot, 1, (share, next) => {
        this.start(share.path, (err) => {
          /* istanbul ignore if */
          if (err) {
            this._log(err.message, 'warn');
          }

          next();
        });
      }, callback);
    });
  }
  /**
   * @callback RPC~loadCallback
   * @param {Error|null} error
   */

  /**
   * Returns the number of shares currently running
   * @private
   */
  get running() {
    let i = 0;

    for (let [, share] of this.shares) {
      if (share.readyState !== 1) {
        continue;
      } else {
        i++;
      }
    }

    return i;
  }

  get methods() {
    return {
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      restart: this.restart.bind(this),
      status: this.status.bind(this),
      killall: this.killall.bind(this),
      destroy: this.destroy.bind(this),
      save: this.save.bind(this),
      load: this.load.bind(this)
    };
  }

}

RPC.SHARE_STARTED = 1;
RPC.SHARE_STOPPED = 0;
RPC.SHARE_ERRORED = 2;
RPC.MAX_RESTARTS = 30;

module.exports = RPC;
