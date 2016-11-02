
'use strict';

var ConfigManager = require('./config');

function Farmer(id, storageDir, options) {
  if (!(this instanceof Farmer)) {
    return new Farmer(id, storageDir, options);
  }

  this.storageDir = storageDir;

  try {
    this.confManager = new ConfigManager(id, options);
  } catch (err) {
    throw err;
  }

}

module.exports = Farmer;
