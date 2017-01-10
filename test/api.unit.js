'use strict';

const RPC = require('../lib/api');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {expect} = require('chai');

describe('class:RPC', function() {

  describe('#_log', function() {

    it('should call the log method', function() {
      let rpc = new RPC({ loggerVerbosity: 0 });
      let info = sinon.stub(rpc.logger, 'info');
      rpc._log('test');
      expect(info.called).to.equal(true);
    });

  });

  describe('#_processShareIpc', function() {

    it('should add the message to the meta.farmerState', function() {
      let rpc = new RPC();
      let share = { meta: {} };
      rpc._processShareIpc(share, { foo: 'bar' });
      expect(share.meta.farmerState.foo).to.equal('bar');
    });

  });

  describe('#start', function() {



  });

  describe('#stop', function() {

    it('should callback error if no share', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      rpc.stop('test', function(err) {
        expect(err.message).to.equal('share test is not running');
        done();
      });
    });

    it('should send sigint to process', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      let _proc = {
        kill: sinon.stub()
      };
      rpc.shares.set('test', {
        process: _proc,
        readyState: 1
      });
      rpc.stop('test', function() {
        expect(_proc.kill.calledWithMatch('SIGINT')).to.equal(true);
        done();
      });
    });

  });

  describe('#restart', function() {

    it('should call stop and start', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      rpc.shares.set('test', {});
      let stop = sinon.stub(rpc, 'stop').callsArg(1);
      let start = sinon.stub(rpc, 'start').callsArg(1);
      rpc.restart('test', function() {
        expect(stop.called).to.equal(true);
        expect(start.called).to.equal(true);
        done();
      });
    });

  });

  describe('#status', function() {

    it('should return the share statuses', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      rpc.shares.set('test', {
        config: 'CONFIG',
        readyState: 'READYSTATE',
        meta: 'META'
      });
      rpc.status(function(err, status) {
        expect(status[0].id).to.equal('test');
        expect(status[0].config).to.equal('CONFIG');
        expect(status[0].state).to.equal('READYSTATE');
        expect(status[0].meta).to.equal('META');
        done();
      });
    });

  });

  describe('#killall', function() {

    it('should destroy shares and exit process', function() {
      let rpc = new RPC({ loggerVerbosity: 0 });
      let destroy = sinon.stub(rpc, 'destroy').callsArg(1);
      let exit = sinon.stub(process, 'exit');
      rpc.shares.set('test1', {});
      rpc.shares.set('test2', {});
      rpc.shares.set('test3', {});
      rpc.killall();
      expect(destroy.callCount).to.equal(3);
      expect(exit.called).to.equal(true);
      exit.restore();
    });

  });

  describe('#destroy', function() {

    it('should callback error if share not running', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      rpc.shares.set('test', { process: null });
      rpc.destroy('test', function(err) {
        expect(err.message).to.equal('share test is not running');
        done();
      });
    });

    it('should send sigint and delete reference', function(done) {
      let rpc = new RPC({ loggerVerbosity: 0 });
      let kill = sinon.stub();
      rpc.shares.set('test', {
        process: {
          kill: kill
        }
      });
      rpc.destroy('test', function() {
        expect(kill.calledWithMatch('SIGINT')).to.equal(true);
        expect(rpc.shares.has('test')).to.equal(false);
        done();
      });

    });
  });

  describe('get#methods', function() {

    it('should return the public methods', function() {
      let rpc = new RPC({ loggerVerbosity: 0 });
      let methods = Object.keys(rpc.methods);
      expect(methods.includes('start')).to.equal(true);
      expect(methods.includes('restart')).to.equal(true);
      expect(methods.includes('stop')).to.equal(true);
      expect(methods.includes('destroy')).to.equal(true);
      expect(methods.includes('status')).to.equal(true);
      expect(methods.includes('killall')).to.equal(true);
    });

  });

});
