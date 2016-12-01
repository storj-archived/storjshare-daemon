[![Storj](https://nodei.co/npm/storjshare-daemon.png?downloads=true)](http://storj.github.io/storjshare-daemon)
==========================================================================================

[![Build Status](https://img.shields.io/travis/Storj/storjshare-daemon.svg?style=flat-square)](https://travis-ci.org/Storj/storjshare-daemon)
[![Coverage Status](https://img.shields.io/coveralls/Storj/storjshare-daemon.svg?style=flat-square)](https://coveralls.io/r/Storj/storjshare-daemon)
[![NPM](https://img.shields.io/npm/v/storjshare-daemon.svg?style=flat-square)](https://www.npmjs.com/package/storjshare-daemon)
[![License](https://img.shields.io/badge/license-AGPL3.0-blue.svg?style=flat-square)](https://raw.githubusercontent.com/Storj/storjshare-daemon/master/LICENSE)

This package exposes a module that provides all of the tools needed to
integrate with the Storj network. You must have Node.js v4.x.x, Python v2.x.x,
and Git installed. [Complete documentation can be found here](http://storj.github.io/core).

```
npm install storjshare-daemon --save
```

Including in your project 
```
var ConfigManager = require('storjshare-daemon').ConfigManager;
var Farmer = require('storjshare-daemon').Farmer;
```

Generating the Config Manager
```
var configName = 'test';
var config = {
      farmerId: configName,
      farmerConf: {
        paymentAddress: '123123334123
      },
      storage: {
        path: '/path/to/datadir',
        dataDir: path.join('/path/to/datadir', 'storjshare-' + configName),
        size: size,
        unit: unit
      }
    };

var configManager = new ConfigManager(config);

configManager.saveConfig(function(err) {
  if (err) {
    console.log(err)
  }
});
```

Generating the Farmer
```
var configName = 'test';
var configManager = new ConfigManager({ farmerId: configName });

// Initialize Farmer with configManager
var farmer = new Farmer(configManager);

// Pipe the output to wherever
configManager.config.farmerConf.logger.pipe(process.stdout);


// Begin Farming
farmer.start(function(err) {
  if(err) {
    console.log('Failed to start: ' + err.message);
  }
});
```

You may also pass a path to the ConfigManager to load a config from a specific location
```
var configName = 'test';
var configPath = '/Desktop/testconfig.json';
var configManager = new ConfigManager({ farmerId: configName }, configPath);
```
