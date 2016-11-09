'use strict';

var Farmer = require('../lib/farmer');
var ConfigManager = require('../lib/config');
var expect = require('chai').expect;
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var fs = require('fs');
var path = require('path');
var DIR = path.basename(__dirname);
var testJsonPath = path.join(DIR, '/_fixtures/test.json');
var testJson = fs.readFileSync(testJsonPath);
var tmpdir = require('os').tmpdir();
var rimraf = require('rimraf');
var storj = require('storj-lib');
var Logger = require('kad-logger-json');

describe('Farmer', function() {

  describe('@constructor', function() {

    it('should work without the new keyword', function() {
      var configManager = new ConfigManager(
        'butts',
        JSON.parse(testJson.toString())
      );
      configManager.updateConfig(
        { storage:
          {
            dataDir: path.join(tmpdir, 'butts'),
            path: tmpdir
          }
        }
      );
      expect(Farmer(configManager)).to.be.instanceOf(Farmer);
      rimraf.sync(path.join(tmpdir, 'butts'));
    });

    it('should throw an error if no ConfigManager was passed in', function() {
      expect(function() {
        Farmer();
      }).to.throw('An instance of ConfigManager must be passed in');
    });

  });

  describe('_prepare', function() {
    it('should prepare the StorageManager using the config', function() {
      var configManager = new ConfigManager(
        'butts',
        JSON.parse(testJson.toString())
      );

      configManager.updateConfig(
        { storage:
          {
            dataDir: path.join(tmpdir, 'butts'),
            path: tmpdir
          }
        }
      );

      var farmer = new Farmer(configManager);
      farmer.prepare();
      var farmerConfig = farmer.configManager.config.farmerConf;
      expect(
        farmerConfig.storageManager instanceof storj.StorageManager &&
        farmerConfig.logger instanceof Logger &&
        farmerConfig.keyPair instanceof storj.KeyPair
      )
        .to.equal(true);
      rimraf.sync(path.join(tmpdir, 'butts'));

    });

  });

  describe('_start', function() {

    it('should start the farmer', function(done) {
      var configManager = new ConfigManager(
        'test',
        JSON.parse(testJson.toString())
      );
      configManager.updateConfig(
        { storage:
          {
            dataDir: path.join(tmpdir, 'test'),
            path: tmpdir
          }
        }
      );
      var stubbedFarmer = proxyquire('../lib/farmer', {
        'storj-lib': {
          FarmerInterface: sinon.stub().returns(
            { join: sinon.stub().callsArgWith(0, null) }
          )
        }
      });
      var farmer = new stubbedFarmer(configManager);
      farmer.start(function(err) {
        expect(err).to.equal(null);
        done();
      });

      rimraf.sync(path.join(tmpdir, 'test'));
    });

  });

});
