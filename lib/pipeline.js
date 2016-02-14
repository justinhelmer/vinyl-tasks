(function() {
  'use strict';

  var _ = require('lodash');
  var chalk = require('chalk');
  var hooks = require('./hooks');
  var Promise = require('bluebird');
  var runner = require('./runner');
  var taskList = require('./task-list');

  /**
   * Run a single continuous pipeline of multiple tasks, by piping the result stream from one task to the next.
   *
   * @name pipeline
   * @param {Array} taskNames - The list of task names to run, in the order to run them. All tasks must already be registered.
   * @param {object} [options] - The options made available to every task in the pipeline.
   * @return {function} - A function that when invoked, returns a promise which resolves if the pipeline completes successfuly,
   *                      or rejects if the pipeline fails at any point.
   */
  function pipeline(taskNames, options) {
    var promises = [];
    var tasks = [];
    var taskString = '';

    _.each(taskNames, function(name, idx) {
      var task = _.find(taskList, {name: name});
      promises.push(hooks.validate(task, options));
      tasks.push(task);

      if (idx !== (taskNames.length - 1)) {
        taskString += name + ', ';
      }
    });

    taskString += 'and ' + _.last(taskNames);

    return function() {
      return Promise.all(promises).then(function(include) {
        if (!options.quiet) {
          console.log('\n' + chalk.green('Creating a single pipeline for', taskString + '...'));
        }

        var included = _.filter(tasks, function(result, idx) {
          return include[idx];
        });

        runner.add('pipeline', chain(included));

        _.each(tasks, function(task) {
          hooks.run(task.name, '__pre', options);
          hooks.run(task.name, 'before', options);
        });

        return start('pipeline', options, false).then(function() {
          _.each(tasks, function(task) {
            hooks.run(task.name, 'done', options);
            hooks.run(task.name, '__post', options);
          });
        });
      });
    };

    /**
     * Create the pipeline chain for the provided tasks.
     *
     * @name chain
     * @param {Array} tasks - The list of task objects to chain callbacks.
     * @return {Function} - A function that when invoked, runs the entire pipeline and returns the vinyl stream.
     */
    function chain(tasks) {
      return function() {
        var pipeline = fullPipeline();

        _.each(tasks, function(task) {
          pipeline = pipeline.pipe(task.callback(options)());
        });

        return pipeline;
      };
    }
  }

  module.exports = pipeline;
})();