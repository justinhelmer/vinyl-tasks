(function() {
  'use strict';

  var _ = require('lodash');
  var chai = require('chai');
  var expect = chai.expect;
  var Promise = require('bluebird');
  var requireSubvert = require('require-subvert')(__dirname);
  var sinon = require('sinon');
  var taskList = require('../lib/task-list');
  var chalk, hooks, sandbox, taskName;

  chai.use(require('dirty-chai'));
  chai.use(require('sinon-chai'));

  describe('hooks', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      taskName = 'TASK_NAME';

      chalk = {
        bold: {
          yellow: sinon.stub().returns('[WARNING]:')
        },
        cyan: sinon.stub().returns(taskName)
      };

      requireSubvert.subvert('chalk', chalk);
    });

    beforeEach(function() {
      hooks = requireSubvert.require('../lib/hooks');
    });

    afterEach(function() {
      sandbox.restore();
      requireSubvert.cleanUp();
      taskList.length = 0;
    });

    describe('hooks.run', function() {
      describe('when the task does not exist', function() {
        beforeEach(function() {
          sandbox.spy(console, 'log');
        });

        it('should log a warning when options.verbose is > 1', function() {
          hooks.run('DOES_NOT_EXIST', null, {verbose: 2});
          expect(chalk.bold.yellow).to.have.been.calledWithExactly('[WARNING]:');
          expect(console.log).to.have.been.calledWithExactly('  -', '[WARNING]:', 'Task \'' + taskName + '\' does not exist');
        });

        it('should not log a warning when options.verbose is not > 1', function() {
          hooks.run('DOES_NOT_EXIST', null, {verbose: 1});
          expect(console.log).not.to.have.been.called();
        });
      });

      describe('when the task exists', function() {
        var task;

        describe('when the op is registered with task.hooks', function() {
          beforeEach(function() {
            task = {
              name: taskName,
              hooks: sinon.stub()
            };

            taskList.push(task);
          });

          it('should execute the task.hook for the specified op', function() {
            var taskHooks = {};
            var op = 'HOOK';
            var options = {};
            taskHooks[op] = sinon.spy();

            task.hooks.returns(taskHooks);
            hooks.run(taskName, op, options);
            expect(taskHooks[op]).to.have.been.calledWithExactly(options);
          });
        });

        describe('when the op is not registered with task.hooks', function() {
          var options;

          describe('__pre hook', function() {
            describe('when options.quiet is set', function() {
              beforeEach(function() {
                options = {quiet: true};
              });

              it('should log nothing', function() {
                sandbox.spy(console, 'log');
                hooks.run(taskName, '__pre', options);
                expect(console.log).not.to.have.been.called();
              });
            });

            describe('when options.quiet is not set', function() {
              beforeEach(function() {
                options = {};
              });

              it('should log a message with the task label, if a task label exists', function() {
                var taskColor = 'magenta';
                var taskLabel = 'TASK_LABEL';

                task = {
                  name: taskName,
                  hooks: _.noop,
                  label: taskLabel,
                  color: taskColor
                };

                taskList.push(task);

                chalk[taskColor] = sinon.stub().returns('');
                hooks.run(taskName, '__pre', options);

                expect(chalk[taskColor]).to.have.been.calledWithExactly('Running', taskLabel + '...');
              });

              it('should log a message with the task name, if a task label does not exist', function() {
                var taskColor = 'blue';

                task = {
                  name: taskName,
                  hooks: _.noop,
                  color: taskColor
                };

                taskList.push(task);

                chalk[taskColor] = sinon.stub().returns('');
                hooks.run(taskName, '__pre', options);

                expect(chalk[taskColor]).to.have.been.calledWithExactly('Running', taskName + '...');
              });
            });
          });

          describe('__post hook', function() {
            describe('when options.quiet is set', function() {
              beforeEach(function() {
                options = {quiet: true};
              });

              it('should log nothing', function() {
                sandbox.spy(console, 'log');
                hooks.run(taskName, '__post', options);
                expect(console.log).not.to.have.been.called();
              });
            });

            describe('when options.quiet is not set', function() {
              beforeEach(function() {
                options = {};
              });

              it('should log a message indicating the task has completed', function() {
                var taskColor = 'red';

                task = {
                  name: taskName,
                  color: taskColor,
                  hooks: _.noop
                };

                taskList.push(task);

                chalk[taskColor] = sinon.stub().returns('');
                hooks.run(taskName, '__post', options);

                expect(chalk[taskColor]).to.have.been.calledWithExactly('Done');
              });
            });
          });
        });
      });
    });

    describe('hooks.validate', function() {
      describe('when no task is provided', function() {
        beforeEach(function() {
          sandbox.spy(console, 'log');
        });

        it('should log a warning if options.verbose is set', function() {
          hooks.validate(null, {verbose: true});
          expect(chalk.bold.yellow).to.have.been.calledWithExactly('[WARNING]:');
          expect(console.log).to.have.been.calledWithExactly('  -', '[WARNING]:', 'Task does not exist');
        });

        it('should not log a warning if options.verbose is not set', function() {
          hooks.validate(null, {});
          expect(console.log).not.to.have.been.called();
        });

        it('should return a promise fulfilled with the value "false"', function() {
          sandbox.stub(Promise, 'resolve').returns('PROMISE');
          var result = hooks.validate(null, {});
          expect(Promise.resolve).to.have.been.calledWithExactly(false);
          expect(result).to.eq('PROMISE');
        });
      });

      describe('when a task is provided', function() {
        it('should check for a validate hook attached to the task', function() {
          var options = {};

          var task = {
            hooks: sandbox.spy()
          };

          hooks.validate(task, options);
          expect(task.hooks).to.have.been.calledWithExactly(options);
        });

        describe('when the task has a validate hook', function() {
          var task, validate;

          beforeEach(function() {
            validate = sandbox.stub();

            task = {
              hooks: function() {
                return {
                  validate: validate
                };
              }
            };
          });

          it('should invoke the validate() hook attached to the task', function() {
            hooks.validate(task, {});
            expect(validate).to.have.been.called();
          });

          it('should return a bluebird promise', function() {
            expect(hooks.validate(task, {})).to.be.instanceof(Promise);
          });

          describe('when the result of the task validate hook is a promise', function(done) {
            it('should fulfill the returned promise with "false" if the result is "false"', function(done) {
              validate.returns(Promise.resolve(false));
              hooks.validate(task, {}).then(function(fulfillment) {
                expect(fulfillment).to.eq(false);
                done();
              });
            });

            it('should fulfill the returned promise with "true" if the result is "true"', function(done) {
              validate.returns(Promise.resolve(true));
              hooks.validate(task, {}).then(function(fulfillment) {
                expect(fulfillment).to.eq(true);
                done();
              });
            });

            it('should fulfill the returned promise with "true" if the result is "undefined"', function(done) {
              validate.returns(Promise.resolve());
              hooks.validate(task, {}).then(function(fulfillment) {
                expect(fulfillment).to.eq(true);
                done();
              });
            });
          });

          describe('when the result of the task validate hook is not a promise', function() {
            it('should fulfill the returned promise with the value returned by the task validate hook', function(done) {
              validate.returns('VALIDATED');
              hooks.validate(task, {}).then(function(fulfillment) {
                expect(fulfillment).to.eq('VALIDATED');
                done();
              });
            });
          });
        });

        describe('when the task does not have a validate hook', function() {
          it('should fulfill the returned promise with the value "true"', function(done) {
            hooks.validate({hooks: _.noop}, {}).then(function(fulfillment) {
              expect(fulfillment).to.eq(true);
              done();
            });
          });
        });
      });
    });
  });
})();