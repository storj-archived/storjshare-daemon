
'use strict';

var fs = require('fs');

function Farmer(driveConf, storageDir) {
  if (!(this instanceof Farmer)) {
    return new Farmer(driveConf, storageDir);
  }

}

module.exports = Farmer;
