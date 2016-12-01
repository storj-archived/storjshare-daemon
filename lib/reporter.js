'use strict';

var utils = require('./utils');
var Logger = require('kad-logger-json');

module.exports.stop = function() {

};

module.exports.start = function() {

};

module.exports.report = function(reporter, config, farmer) {
  var logger = new Logger(config.loglevel);

  function send() {
    utils.getDirectorySize(config.storage.path, function(err, size) {
      /*jshint maxcomplexity:10 */
      if (err) {
        return;
      }

      var totalSpace = Number(config.storage.size);

      switch (config.storage.unit) {
        case 'MB':
          totalSpace = totalSpace * Math.pow(1024, 2);
          break;
        case 'GB':
          totalSpace = totalSpace * Math.pow(1024, 3);
          break;
        case 'TB':
          totalSpace = totalSpace * Math.pow(1024, 4);
          break;
        default:
          // NOOP
      }

      var report = {
        storage: {
          free: Number((totalSpace - size).toFixed()),
          used: Number(size.toFixed())
        },
        contact: farmer.contact,
        payment: config.address
      };

      process.stdout.write(JSON.stringify({type: 'info',
          message: 'telemetry report ' + JSON.stringify(report),
          timestamp: new Date()
        }) + '\n');

      reporter.send(report, function(err, report) {
        if (err) {
          return logger.error(err.message);
        }

        logger.info('sent telemetry report: %j', JSON.stringify(report));
      });
    });

    setTimeout(function() {
      module.exports.report(reporter, config, farmer);
    }, 5 * (60 * 1000));
  }

  send();
};
