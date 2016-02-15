(function() {
  'use strict';

  var chai = require('chai');
  var expect = chai.expect;
  var hooks = require('../lib/hooks');
  var Promise = require('bluebird');
  var runner = require('../lib/runner');
  var sinon = require('sinon');
  var start = require('../lib/start');
  var chalk, sandbox;

  chai.use(require('dirty-chai'));
  chai.use(require('sinon-chai'));

  describe('start', function() {
    var taskName;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(hooks, 'run');
      sandbox.stub(runner, 'start');

      taskName = 'TASK_NAME';
    });

    it('should run the __pre and before hooks if runHooks is undefined', function() {
      var options = {};
      start(taskName, options);
      expect(hooks.run).to.have.been.calledWithExactly(taskName, '__pre', options);
      expect(hooks.run).to.have.been.calledWithExactly(taskName, 'before', options);
    });

    it('should run the __pre and before hooks if runHooks is true', function() {
      var options = {};
      start(taskName, options, true);
      expect(hooks.run).to.have.been.calledWithExactly(taskName, '__pre', options);
      expect(hooks.run).to.have.been.calledWithExactly(taskName, 'before', options);
    });

    it('should not run the __pre and before hooks if runHooks is false', function() {
      var options = {};
      start(taskName, options, false);
      expect(hooks.run).not.to.have.been.called();
      expect(hooks.run).not.to.have.been.called();
    });

    it('should start the task orchestration for the supplied task name', function() {
      start(taskName);
      expect(runner.start).to.have.been.calledWithExactly(taskName, sinon.match.func);
    });

    it('should return a bluebird promise', function() {
      expect(start()).to.be.instanceof(Promise);
    });

    describe('executing the test runner', function() {
      describe('when the test runner fails', function() {
        it('should reject the returned promise with the error', function(done) {
          var error = new Error('ERROR');
          var result = start();
          runner.start.args[0][1](error);
          result.catch(function(err) {
            expect(err.message).to.eq(error.message);
            done();
          });
        });
      });

      describe('when the test runner succeeds', function() {
        it('should run the done and __post hooks if runHooks is not false', function() {
          var options = {};
          start(taskName, options);
          runner.start.args[0][1]();
          expect(hooks.run).to.have.been.calledWithExactly(taskName, 'done', options);
          expect(hooks.run).to.have.been.calledWithExactly(taskName, '__post', options);
        });

        it('should not run the done and __post hooks if runHooks is false', function() {
          var options = {};
          start(taskName, options, false);
          runner.start.args[0][1]();
          expect(hooks.run).not.to.have.been.called();
          expect(hooks.run).not.to.have.been.called();
        });

        it('should fulfill the returned promise with nothing', function(done) {
          var result = start();
          runner.start.args[0][1]();
          result.then(function(fulfillment) {
            expect(fulfillment).to.be.a('undefined');
            done();
          });
        });
      });
    });

    afterEach(function() {
      sandbox.restore();
    });
  });
})();