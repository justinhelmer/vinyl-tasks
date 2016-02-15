(function() {
  'use strict';

  var _ = require('lodash');
  var chalk = require('chalk');
  var isPromise = require('is-promise');
  var Promise = require('bluebird');
  var taskList = require('./task-list');

  module.exports = {
    run: run,
    validate: validate
  };

  function coreHooks(task) {
    return {
      __pre: function __pre(options) {
        if (!options.quiet) {
          console.log(chalk[task.color]('Running', (task.label || task.name) + '...'));
        }
      },

      __post: function __post(options) {
        if (!options.quiet) {
          console.log(chalk[task.color]('Done'));
        }
      }
    };
  }

  /**
   * Generic interface for hooking into task registration/execution workflow.
   *
   * @name run
   * @param {string} name - The name of the task.
   * @param {string} op - The hook operation. Possible values: 'before', 'done', and 'validate'.
   * @param {object} [options] - The task run options, passed to the hook callback function for use by the task.
   */
  function run(name, op, options) {
    var task = _.find(taskList, {name: name});

    if (task) {
      var _hook = _.get(task.hooks(options), op) || coreHooks(task)[op];

      if (_.isFunction(_hook)) {
        _hook(options);
      }
    } else {
      if (options.verbose > 1) {
        console.log('  -', chalk.bold.yellow('[WARNING]:'), 'Task \'' + chalk.cyan(name) + '\' does not exist');
      }
    }
  }

  /**
   * Hook executed before task is run.
   *
   * Validate whether or not the task should be run. Should return `true` or `false` to indicate whether or not to run the task.
   * Can also return a bluebird promise that resolves with the value of `true` or `false`.
   *
   * @name validate
   * @param {object} task - The task object.
   * @param {object} [options] - Options passed to the task runner. Uses options.verbose.
   * @return {bluebird promise} - Resolves with `true` if the task validation succeeds, or `false` if the task validation fails.
   */
  function validate(task, options) {
    if (!task) {
      if (options.verbose) {
        console.log('  -', chalk.bold.yellow('[WARNING]:'), 'Task does not exist');
      }

      return Promise.resolve(false);
    }

    return new Promise(function(resolve, reject) {
      var hooks = task.hooks(options) || {};

      if (hooks.validate) {
        var result = hooks.validate();

        if (isPromise(result)) {
          result.then(function(result) {
            resolve(result !== false); // undefined should represent truthy
          });
        } else {
          resolve(result);
        }
      } else {
        resolve(true);
      }
    });
  }
})();