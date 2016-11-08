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

describe('Farmer', function() {

  describe('@constructor', function() {

    it('should work without the new keyword', function() {
      var configManager = new ConfigManager(
        'test',
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

});
