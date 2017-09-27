'use strict';

const utils = require('../lib/utils');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {expect} = require('chai');
const {EventEmitter} = require('events');
const net = require('net');

describe('module:utils', function() {

  describe('#_isValidPayoutAddress', function() {

    it('should return true for valid mainnet', function() {
      expect(utils._isValidPayoutAddress(
        '1ATyTAjFpeU2RrwVzk9YEa2vxQJos4xdqX'
      )).to.equal(true);
    });

    it('should return true for valid testnet', function() {
      expect(utils._isValidPayoutAddress(
        '2MsP1UsraqLpY7A1ZeegT7H7okWWkBbk2AS'
      )).to.equal(true);
    });

    it('should return false for invalid address', function() {
      expect(utils._isValidPayoutAddress(
        '1234 Fake Street'
      )).to.equal(false);
    });

  });

  describe('#isValidEthereumAddress', function() {

    it('should return true for checksumed address', function() {
      expect(utils.isValidEthereumAddress(
        '0xC2D7CF95645D33006175B78989035C7c9061d3F9'
      )).to.equal(true);
    });

    it('should return true for normalized address', function() {
      expect(utils.isValidEthereumAddress(
        '0xc2d7cf95645d33006175b78989035c7c9061d3f9'
      )).to.equal(true);
    });

    it('should return true for uppercase address', function() {
      expect(utils.isValidEthereumAddress(
        '0xC2D7CF95645D33006175B78989035C7C9061D3F9'
      )).to.equal(true);
    });

    it('should return false for invalid checksum', function() {
      expect(utils.isValidEthereumAddress(
        '0xC2D7Cf95645D33006175B78989035C7c9061d3F9'
      )).to.equal(false);
    });

    it('should return false for public key hash digest', function() {
      expect(utils.isValidEthereumAddress(
        'C2D7CF95645D33006175B78989035C7c9061d3F9'
      )).to.equal(false);
    });

    it('should return false for invalid address', function() {
      expect(utils.isValidEthereumAddress(
        '1234 Fake Street'
      )).to.equal(false);
    });

    it('should return false for contract address', function() {
      expect(utils.isValidEthereumAddress(
        '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac'
      )).to.equal(false);
    });

    it('should return false for contract owner address', function() {
      expect(utils.isValidEthereumAddress(
        '0x00f6bf3c5033e944feddb3dc8ffb4d47af17ef0b'
      )).to.equal(false);
    });

  });

  describe('#_isValidDirectory', function() {

    it('should return the the result of existsSync', function() {
      let existsSync = sinon.stub(utils, 'existsSync').returns(true);
      expect(utils._isValidDirectory('some/directory/path')).to.equal(true);
      existsSync.restore();
    });

    it('should return the the result of existsSync', function() {
      let existsSync = sinon.stub(utils, 'existsSync').returns(false);
      expect(utils._isValidDirectory('some/directory/path')).to.equal(false);
      existsSync.restore();
    });

  });

  describe('#_isValidSize', function() {

    it('should return true for positive numbers', function() {
      expect(utils._isValidSize(1)).to.equal(true);
    });

    it('should return false for less than 0', function() {
      expect(utils._isValidSize(0)).to.equal(true);
      expect(utils._isValidSize(-1)).to.equal(false);
    });

    it('should return false for undefined', function() {
      expect(utils._isValidSize()).to.equal(false);
    });

  });

  describe('#validate', function() {

    it('should not throw if valid', function() {
      let _isValidDirectory = sinon.stub(
        utils,
        '_isValidDirectory'
      ).returns(true);
      expect(function() {
        utils.validate({
          paymentAddress: '2MsP1UsraqLpY7A1ZeegT7H7okWWkBbk2AS',
          storagePath: 'some/directory/path',
          storageAllocation: '1KB'
        });
      }).to.not.throw(Error);
      _isValidDirectory.restore();
    });

    it('should throw if not valid', function() {
      let _isValidDirectory = sinon.stub(
        utils,
        '_isValidDirectory'
      ).returns(false);
      expect(function() {
        utils.validate({
          paymentAddress: '2MsP1UsraqLpY7A1ZeegT7H7okWWkBbk2AS',
          storagePath: 'some/directory/path',
          storageAllocation: '1KB'
        });
      }).to.throw(Error);
      _isValidDirectory.restore();
    });

  });

  describe('#repairConfig', function() {

    it('should convert an unspecified size to bytes', function() {
      let dummyConfig = {
        storageAllocation: 1048576
      };
      utils.repairConfig(dummyConfig);
      expect(dummyConfig.storageAllocation).to.equal('1048576B');
    });

  });

  describe('#validateAllocation', function() {

    it('should callback null if valid', function(done) {
      let getFreeSpace = sinon.stub(
        utils,
        'getFreeSpace'
      ).callsArgWith(1, null, 1024);
      let getDirectorySize = sinon.stub(
        utils,
        'getDirectorySize'
      ).callsArgWith(1, null, 512);
      utils.validateAllocation({
        storageAllocation: '512B',
        storagePath: 'some/directory/path'
      }, function(err) {
        getFreeSpace.restore();
        getDirectorySize.restore();
        expect(err).to.equal(null);
        done();
      });
    });

  });

  describe('#portIsAvailable', function() {

    it('should callback error if argument is not a valid port', function(done) {
      utils.portIsAvailable('Not a port number', function(err, result) {
        expect(err).to.equal('Invalid port');
        expect(result).to.equal(undefined);
        done();
      });
    });

    it('should callback error if port is in well-known range', function(done) {
      utils.portIsAvailable(77, function(err, result) {
        expect(err).to.equal(
          'Using a port in the well-known range is strongly discouraged');
        done();
        expect(result).to.equal(undefined);
      });
    });

    it('should hopefully return true on this semi-random port', function(done) {
      utils.portIsAvailable(17026, function(err, result) {
        expect(err).to.equal(null);
        expect(result).to.equal(true);
        done();
      });
    });

    it('should return false on a port already in use', function(done) {
      const server = net.createServer();
      server.once('error', function(err) {
        done(err);
      })
      .once('listening', function() {
        utils.portIsAvailable(17027, function(err, result) {
          expect(err).to.equal(null);
          expect(result).to.equal(false);
          server.once('close', function() {
            done();
          }).close();
        });
      })
      .listen(17027);
    });

  });

  describe('#existsSync', function() {

    it('should return true if statSync success', function() {
      let _utils = proxyquire('../lib/utils', {
        fs: {
          statSync: sinon.stub().returns({})
        }
      });
      expect(_utils.existsSync('some/directory/path')).to.equal(true);
    });

    it('should return false if statSync false', function() {
      let _utils = proxyquire('../lib/utils', {
        fs: {
          statSync: sinon.stub().throws(new Error(''))
        }
      });
      expect(_utils.existsSync('some/directory/path')).to.equal(false);
    });

  });

  describe('#checkDaemonRpcStatus', function() {

    it('should callback true if connect', function(done) {
      let sock = new EventEmitter();
      sock.end = sinon.stub();
      let _utils = proxyquire('../lib/utils', {
        net: {
          connect: () => {
            setTimeout(() => sock.emit('connect'), 50);
            return sock;
          }
        }
      });
      _utils.checkDaemonRpcStatus(45015, (isRunning) => {
        expect(isRunning).to.equal(true);
        done();
      });
    });

    it('should callback false if error', function(done) {
      let sock = new EventEmitter();
      sock.end = sinon.stub();
      let _utils = proxyquire('../lib/utils', {
        net: {
          connect: () => {
            setTimeout(() => sock.emit('error',
                                       new Error('ECONNREFUSED')), 50);
            return sock;
          }
        }
      });
      _utils.checkDaemonRpcStatus(45015, (isRunning) => {
        expect(isRunning).to.equal(false);
        done();
      });
    });

  });

  describe('#connectToDaemon', function() {

    it('should set the process exit code and log error', function(done) {
      let socket = new EventEmitter();
      let error = sinon.stub(console, 'error');
      let _utils = proxyquire('../lib/utils', {
        dnode: {
          connect: () => socket
        }
      });
      _utils.connectToDaemon(45015, () => null);
      setImmediate(() => {
        socket.emit('error', new Error('Failed to connect'));
        setImmediate(() => {
          error.restore();
          expect(process.exitCode).to.equal(1);
          process.exitCode = 0;
          done();
        });
      });
    });

    it('should callback with remote object and socket', function(done) {
      let socket = new EventEmitter();
      let rpc = {};
      let _utils = proxyquire('../lib/utils', {
        dnode: {
          connect: () => socket
        }
      });
      _utils.connectToDaemon(45015, (_rpc, sock) => {
        expect(_rpc).to.equal(rpc);
        expect(sock).to.equal(socket);
        done();
      });
      setImmediate(() => socket.emit('remote', rpc));
    });

  });

});
