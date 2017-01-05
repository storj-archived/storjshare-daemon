'use strict';

const mkdirp = require('mkdirp');
const path = require('path');
const {homedir} = require('os');
const datadir = path.join(homedir(), '.config', 'storjshare');

mkdirp.sync(datadir);
mkdirp.sync(path.join(datadir, 'logs'));

module.exports = require('rc')('storjshare-daemon', {
  daemonRpcPort: 45015,
  daemonRpcAddress: '127.0.0.1',
  daemonLogFilePath: path.join(datadir, 'logs', 'daemon.log'),
  daemonLogVerbosity: 3
});
