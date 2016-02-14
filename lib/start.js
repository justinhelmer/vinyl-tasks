(function() {
  'use strict';

  var _ = require('lodash');
  var hooks = require('./hooks');
  var plumber = require('gulp-plumber');
  var Promise = require('bluebird');
  var runner = require('./runner');
  var vfs = require('vinyl-fs');
  var write = process.stdout.write;

  /**
   * Promisify the execution of an orchestrator task. Listens to orchestrator events to fulfill/reject the promise.
   *
   * @name start
   * @param {string} name - The name of the task to run.
   * @param {object} [options] - Options passed to the task runner. Uses options.verbose and options.quiet
   * @param {boolean} [runHooks=true] - Whether or not to execute the hooks for the task. defaults to true.
   * @return {promise} - Resolves if the task completes successfuly, rejects with the error object if the task fails.
   * @see https://github.com/robrich/orchestrator#event
   */
  function start(name, options, runHooks) {
    options = options || {};
    runHooks = runHooks !== false; // default to true if not explicitly set to false

    if (runHooks) {
      hook.run(name, '__pre', options);
      hook.run(name, 'before', options);
    }

    return new Promise(function(resolve, reject) {
      if (!options.verbose && options.quiet) {
        process.stdout.write = _.noop;
      }

      runner.start(name, function(err) {
        process.stdout.write = write;

        if (err) {
          reject(err);
        } else {
          if (runHooks) {
            hook.run(name, 'done', options);
            hook.run(name, '__post', options);
          }

          resolve();
        }
      });
    });
  }

  module.exports = start;
})();