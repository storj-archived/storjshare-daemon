'use strict';

const {statSync, readFileSync} = require('fs');
const stripJsonComments = require('strip-json-comments');
const JsonLogger = require('kad-logger-json');
const {fork} = require('child_process');

/** Class representing a local RPC API's handlers */
class RPC {

  /**
   * Creates a environment to manage share processes
   * @param {Object} options
   * @param {Number} options.logVerbosity
   */
  constructor(options) {
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
   * Starts a share process with the given configuration
   * @param {String} configPath
   * @param {RPC~startCallback}
   * @see https://storj.github.io/core/FarmerInterface.html
   */
  start(configPath, callback) {
    this._log(`attempting to start share with config at path ${configPath}`);

    try {
      statSync(configPath);
    } catch (err) {
      return callback(new Error(`failed to read config at ${configPath}`));
    }

    try {
      JSON.parse(stripJsonComments(readFileSync(configPath).toString()));
    } catch (err) {
      return callback(new Error(`failed to parse config at ${configPath}`));
    }

    // TODO: Fork the actual farmer process, passing it the configuration
    // TODO: Pipe the stdio to the configured log file
    // TODO: Listen for state changes to update the shares record
    //

    callback(null);
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

    if (!this.shares.has(nodeId) || !this.shares.get(nodeId).process) {
      return callback(new Error(`share ${nodeId} is not running`));
    }

    this.shares.get(nodeId).process.kill('SIGINT');
    callback(null);
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
    this.stop(nodeId, (err) => {
      if (err) {
        return callback(err);
      }

      this.start(this.shares.get(nodeId).config, callback);
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
        nodeId: nodeId,
        parsedConfig: share.config,
        readyState: share.process ? 1 : 0
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
  killall() {
    this._log(`received kill signal, destroying running shares`);

    for (let nodeId of this.shares.keys()) {
      this.destroy(nodeId, () => null);
    }

    process.exit(0);
  }

  /**
   * Kills the share with the given node ID
   * @param {String} nodeId
   * @param {RPC~destroyCallback}
   */
  destroy(nodeId, callback) {
    this._log(`received destroy command for ${nodeId}`);

    if (!this.shares.has(nodeId)) {
      return callback(new Error(`share ${nodeId} is not running`));
    }

    share.process.kill('SIGINT');
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

module.exports = RPC;
