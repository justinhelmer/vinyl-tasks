(function() {
  'use strict';

  var _ = require('lodash');
  var chai = require('chai');
  var expect = chai.expect;
  var requireSubvert = require('require-subvert')(__dirname);
  var sinon = require('sinon');
  var taskList = require('../lib/task-list');
  var Promise = require('bluebird');
  var create, fullPipeline, hooks, pipe, runner, start, validate;

  chai.use(require('dirty-chai'));
  chai.use(require('sinon-chai'));

  describe('create', function() {
    var sandbox, task, taskName;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      taskName = 'TASK_NAME';

      task = {
        name: taskName,
        callback: _.noop
      };

      var chalk = {cyan: sandbox.stub().returns(taskName)};
      validate = sandbox.spy();
      hooks = {validate: sandbox.stub().returns({then: validate})};
      runner = {add: sandbox.spy()};
      start = sandbox.stub().returns('FINISHED');
      pipe = sandbox.stub().returns('PIPED');
      fullPipeline = sandbox.stub().returns({pipe: pipe});
      requireSubvert.subvert('chalk', chalk);
      requireSubvert.subvert('../lib/full-pipeline', fullPipeline);
      requireSubvert.subvert('../lib/hooks', hooks);
      requireSubvert.subvert('../lib/runner', runner);
      requireSubvert.subvert('../lib/start', start);
    });

    beforeEach(function() {
      create = requireSubvert.require('../lib/create');
    });

    afterEach(function() {
      sandbox.restore();
      requireSubvert.cleanUp();
      taskList.length = 0;
    });

    describe('creating the task', function() {
      it('should throw an error if the task is a non-object', function() {
        expect(create).to.throw('Invalid task: undefined');
        expect(_.partial(create, taskName)).to.throw('Invalid task: ' + taskName);
        expect(_.partial(create, [])).to.throw('Invalid task: ');
      });

      it('should throw an error if the task is missing a name', function() {
        expect(_.partial(create, {})).to.throw('Task must supply a name.');
      });

      it('should throw an error if the task is missing an associated callback', function() {
        expect(_.partial(create, {name: taskName})).to.throw('Task \'' + taskName + '\' is missing an associated callback.');
      });

      it('should set defaults that are not specified', function() {
        create(task);

        expect(task).to.eql({
          name: taskName,
          callback: _.noop,
          chainable: true,
          color: 'cyan',
          hooks: _.noop
        });
      });

      it('should should not set defaults for properties that are specified', function() {
        var hooks = function() {};

        _.extend(task, {
          chainable: false,
          color: 'magenta',
          hooks: hooks
        });

        create(task);

        expect(task).to.eql({
          name: taskName,
          callback: _.noop,
          chainable: false,
          color: 'magenta',
          hooks: hooks
        });
      });

      it('should add the task to the global task list', function() {
        create(task);
        expect(taskList.length).to.eq(1);
        expect(taskList[0]).to.eq(task);
      });

      it('should return a task runner function', function() {
        expect(create(task)).to.be.a('function');
      });
    });

    describe('running the task', function() {
      var invoked, log, options;

      beforeEach(function() {
        invoked = sandbox.stub().returns('CALLBACK');
        options = {quiet: true};

        _.extend(task, {
          callback: function () {
            return invoked;
          }
        });

        sandbox.stub(Promise, 'reject').returns('REJECTED');
        sandbox.spy(console, 'log');
      });

      it('should create a full pipeline for chainable tasks', function() {
        create(task)(options);
        expect(fullPipeline).to.have.been.called();
      });

      it('should not create a pipeline for non chainable tasks', function() {
        create(_.extend(task, {chainable: false}))({quiet: true});
        expect(fullPipeline).not.to.have.been.called();
      });

      it('should add the task to the common orchestration layer', function() {
        create(task)(options);
        expect(runner.add).to.have.been.calledWithExactly(task.name, sinon.match.func);
      });

      it('should validate the task', function() {
        create(task)(options);
        expect(hooks.validate).to.have.been.calledWithExactly(task, options);
      });

      describe('when validation succeeds', function() {
        it('should log a blank line if options.quiet is not set', function() {
          console.log = sandbox.spy();
          create(task)(_.extend(options, {quiet: false}));
          validate.args[0][0](true);
          expect(console.log).to.have.been.called();
        });

        it('should not log a blank line if options.quiet is set', function() {
          create(task)(options);
          validate.args[0][0](true);
          expect(console.log).not.to.have.been.called();
        });

        it('should run the task', function() {
          create(task)(options);
          validate.args[0][0](true);
          expect(start).to.have.been.calledWithExactly(task.name, options);
        });

        it('should return the result of the task run', function() {
          create(task)(options);
          expect(validate.args[0][0](true)).to.eq('FINISHED');
        });
      });

      describe('when validation fails', function() {
        it('should return a rejected promise', function() {
          create(task)(options);
          var result = validate.args[0][0](false);
          expect(Promise.reject).to.have.been.calledWithExactly(new Error());
          expect(Promise.reject.args[0][0].message).to.eql('Unknown task: ' + taskName);
          expect(result).to.eq('REJECTED');
        });

        it('should not log anything', function() {
          create(task)(_.extend(options, {quiet: false}));
          validate.args[0][0](false);
          expect(console.log).not.to.have.been.called();
        });

        it('should not execute any tasks', function() {
          create(task)(options);
          validate.args[0][0](false);
          expect(start).not.to.have.been.called();
        });
      });

      describe('executing the task callback', function() {
        describe('when the task is chainable', function() {
          var result;

          beforeEach(function() {
            create(task)(options);
            result = runner.add.args[0][1]();
          });

          it('should pipe the top-level stream to the result of the task callback', function() {
            expect(pipe).to.have.been.calledWithExactly('CALLBACK');
          });

          it('should return the result of the top-level pipeline', function() {
            expect(result).to.eq('PIPED');
          });
        });

        describe('when the task is not chainable', function() {
          it('should register the task callback result directly to the orchestration layer', function() {
            create(_.extend(task, {chainable: false}))(options);
            expect(runner.add.args[0][1]).to.eq(invoked);
          });
        });
      });
    });
  });
})();