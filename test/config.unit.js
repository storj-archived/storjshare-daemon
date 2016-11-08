'use strict';

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

describe('ConfigManager', function() {

  describe('@constructor', function() {

    it('should work without the new keyword', function() {
      expect(ConfigManager('test')).to.be.instanceOf(ConfigManager);
    });

    it('should throw an error if no farmerId', function() {
      expect(function() {
        ConfigManager();
      }).to.throw('A unique farmerId must be passed in');
    });

    it('should merge with config passed in constructor', function() {
      var stubbedConfigManager = proxyquire('../lib/config', {
        './utils': {
          existsSync: sinon.stub().returns(true)
        },
        'fs': {
          readFileSync: sinon.stub().returns(testJson),
          writeFileSync: sinon.stub()
        }
      });
      var configManager = new stubbedConfigManager('test', { loglevel: 2 });
      expect(configManager.config).to.have.property('loglevel')
        .and.equal(2);
    });

  });

  describe('_readConf', function() {

    it('should return defaults if no conf file exists', function() {
      var configManager = new ConfigManager('test');
      expect(configManager._readConf()).to.equal(ConfigManager.DEFAULTS);
    });

    it('should return config from file if it exists', function() {
      var stubbedConfigManager = proxyquire('../lib/config', {
        './utils': {
          existsSync: sinon.stub().returns(true)
        },
        'fs': {
          readFileSync: sinon.stub().returns(testJson),
          writeFileSync: sinon.stub()
        }
      });
      var configManager = new stubbedConfigManager('test');
      expect(configManager._readConf()).to.have.property('loglevel')
        .and.equal(3);
    });

    it('should throw an error if config is messed up', function() {
      var stubbedConfigManager = proxyquire('../lib/config', {
        './utils': {
          existsSync: sinon.stub().returns(true)
        },
        'fs': {
          readFileSync: sinon.stub().returns('1ij23hb3418i23uyg{}ASdkd'),
          writeFileSync: sinon.stub()
        }
      });
      expect(function() {
        stubbedConfigManager('test');
      }).to.throw(SyntaxError);
    });
  });

  describe('_saveConfigSync', function() {

    it('should save the config', function() {
      var configManager = new ConfigManager('test');
      configManager.confPath = path.join(tmpdir, 'test.json');
      configManager.saveConfigSync();
      expect(JSON.parse(fs.readFileSync(configManager.confPath).toString()))
      .to.have.property('farmerConf');
      fs.unlinkSync(configManager.confPath);
    });

  });

  describe('_saveConfig', function() {

    it('should save the config', function(done) {
      var configManager = new ConfigManager('test');
      configManager.confPath = path.join(tmpdir, 'test.json');
      configManager.saveConfig(function() {
        expect(JSON.parse(fs.readFileSync(configManager.confPath).toString()))
        .to.have.property('farmerConf');
        fs.unlinkSync(configManager.confPath);
        done();
      });

    });

  });

  describe('_updateConfig', function() {

    it('should update the config', function() {
      var configManager = new ConfigManager('test');
      configManager.updateConfig({ loglevel: 5 });
      expect(configManager.config).to.have.property('loglevel')
        .and.equal(5);
    });

  });

  describe('_getAddress', function() {

    it('should return an address formatted without whitespace', function() {
      var configManager = new ConfigManager('test');
      configManager.updateConfig({ farmerConf: { paymentAddress: ' 1234 ' }});
      expect(configManager.getAddress()).to.equal('1234');
    });

  });
});
