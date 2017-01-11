'use strict';

const storj = require('storj-lib');
const fs = require('fs');
const {statSync, readFileSync} = require('fs');
const stripJsonComments = require('strip-json-comments');
const JsonLogger = require('kad-logger-json');
const {fork} = require('child_process');
const utils = require('./utils');
const path = require('path');

/** Class representing a local RPC API's handlers */
class RPC {

  /**
   * Creates a environment to manage share processes
   * @param {Object} options
   * @param {Number} options.logVerbosity
   */
  constructor(options={}) {
    this.logger = new JsonLogger(options.logVerbosity);
    this.shares = new Map();
  }

  /**
   * Logs the message by pushing it out the stream
   * @param {String} message
   * @param {String} level
   */
  _log(msg, level='info') {
    this.logger[level](msg);
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
   * Starts a share process with the given configuration
   * @param {String} configPath
   * @param {RPC~startCallback}
   * @see https://storj.github.io/core/FarmerInterface.html
   */
  start(configPath, callback) {
    const self = this;
    let share = {
      config: null,
      meta: {
        uptimeMs: 0,
        numRestarts: 0,
        farmerState: {}
      },
      process: null,
      readyState: 0,
      path: configPath
    };

    this._log(`attempting to start share with config at path ${configPath}`);

    try {
      statSync(configPath);
    } catch (err) {
      return callback(new Error(`failed to read config at ${configPath}`));
    }

    try {
      share.config = JSON.parse(stripJsonComments(
        readFileSync(configPath).toString()
      ));
    } catch (err) {
      return callback(new Error(`failed to parse config at ${configPath}`));
    }

    try {
      utils.validate(share.config);
    } catch (err) {
      return callback(new Error(err.message.toLowerCase()));
    }

    let nodeId = storj.KeyPair(share.config.networkPrivateKey).getNodeID();

    if (self.shares.has(nodeId) && self.shares.get(nodeId).readyState === 1) {
      return callback(new Error(`share ${nodeId} is already running`));
    }

    utils.validateAllocation(share.config, (err) => {
      if (err) {
        return callback(new Error(err.message.toLowerCase()));
      }

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

      let logFile = fs.createWriteStream(share.config.loggerOutputFile, {
        flags: 'a'
      });

      // NB: Pipe the stdio to the configured log file
      share.process.stdout.pipe(logFile);
      share.process.stderr.pipe(logFile);

      // NB: Listen for state changes to update the share's record
      share.process.on('error', (err) => {
        share.readyState = RPC.SHARE_ERRORED;
        self._log(err.message, 'error');
        clearInterval(uptimeCounter);
      });

      // NB: Listen for exits and restart the share if not stopped manually
      share.process.on('exit', (code, signal) => {
        let maxRestartsReached = share.meta.numRestarts >= RPC.MAX_RESTARTS;
        share.readyState = RPC.SHARE_STOPPED;

        self._log(`share ${nodeId} exited with code ${code}`);
        clearInterval(uptimeCounter);

        if (signal !== 'SIGINT' && !maxRestartsReached) {
          share.meta.numRestarts++;
          self.restart(nodeId, () => null);
        }
      });

      share.process.on('message', (msg) => self._processShareIpc(share, msg));
      self.shares.set(nodeId, share);
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
    this._log(`got status query`);

    let statuses = [];

    this.shares.forEach((share, nodeId) => {
      statuses.push({
        id: nodeId,
        config: share.config,
        state: share.readyState,
        meta: share.meta
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

    this.shares.get(nodeId).process.kill('SIGINT');
    this.shares.delete(nodeId);
    callback(null);
  }
  /**
   * @callback RPC~destroyCallback
   * @param {Error|null} error
   */

  get methods() {
    return {
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      restart: this.restart.bind(this),
      status: this.status.bind(this),
      killall: this.killall.bind(this),
      destroy: this.destroy.bind(this)
    };
  }

}

RPC.SHARE_STARTED = 1;
RPC.SHARE_STOPPED = 0;
RPC.SHARE_ERRORED = 2;
RPC.MAX_RESTARTS = 30;

module.exports = RPC;
