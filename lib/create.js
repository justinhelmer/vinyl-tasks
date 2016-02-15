(function() {
  'use strict';

  var _ = require('lodash');
  var chalk = require('chalk');
  var fullPipeline = require('./full-pipeline');
  var hooks = require('./hooks');
  var Promise = require('bluebird');
  var runner = require('./runner');
  var start = require('./start');
  var taskList = require('./task-list');
  var vfs = require('vinyl-fs');

  /**
   * Create a task runner for the given task object.
   *
   * @param {object} task - The configuration options that define the task.
   * @param {string} task.name - The unique task name for identification.
   * @param {function} task.callback - The callback that when invoked, returns the function for performing all operations related to the task.
   *                                   Must return a lazy pipeline for chainability.
   * @param {boolean} [task.chainable] - If true, creates a new top-level vinyl stream from all files, except node modules. Defaults to true.
   * @param {string} [task.color] - The chalk color to use when logging certain characteristics about the task.
   * @param {object} [task.hooks] - A function that when invoked, returns an object containing hooks for tapping into the tasks workflow.
   * @param {function} [task.hooks.before] - A function run before the task callback, after validation is successful.
   * @param {function} [task.hooks.done] - A function run after the task callback successfully completes.
   * @param {function} [task.hooks.validate] - A function to validate whether or not the task should be run. Should return `true` or `false` to
   *                                           indicate whether or not to run the task. Can also return a promise that resolves with
   *                                           the value of `true` or `false`.
   * @param {string} [task.label] - The label to use when logging to identify the task action.
   *
   * @return {function} - A runner for the task that can be invoked with [options] to modify the behavior per-run.
   * @see https://github.com/OverZealous/lazypipe
   * @see https://github.com/gulpjs/vinyl-fs#api
   */
  function create(task) {
    if (!_.isPlainObject(task)) {
      throw new Error('Invalid task:' + task);
    }

    if (!task.name) {
      throw new Error('Task must supply a name.');
    }

    if (!_.isFunction(task.callback)) {
      throw new Error('Task \'' + chalk.cyan(task.name) + '\' is missing an associated callback.');
    }

    // should default to true if not specified
    task.chainable = task.chainable !== false;

    taskList.push(_.defaults(task, {
      color: 'cyan',
      hooks: _.noop
    }));

    return function(options) {
      var pipeline = task.chainable ? fullPipeline() : null;
      var callback;
      var run;

      if (task.chainable) {
        // lazy pipeline needs to be invoked
        callback = task.callback(options)();
      } else {
        callback = task.callback(options);
      }

      if (pipeline) {
        run = function() {
          return pipeline.pipe(callback);
        };
      } else {
        run = callback;
      }

      runner.add(task.name, run);

      return hooks.validate(task, options).then(function(dontSkip) {
        if (dontSkip) {
          if (!options.quiet) {
            console.log();
          }

          return start(task.name, options);
        }

        return Promise.reject(new Error('Unknown task ' + name));
      });
    };
  }

  module.exports = create;
})();