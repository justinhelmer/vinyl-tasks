(function() {
  'use strict';

  var plumber = require('gulp-plumber');
  var runner = require('./runner');
  var vfs = require('vinyl-fs');
  var write = process.stdout.write;

  /**
   * Generate a new top-level pipeline containing all files, and attach a common error handler.
   *
   * @name fullPipeline
   * @return {stream} - The vinyl stream.
   * @see https://github.com/gulpjs/vinyl-fs#srcglobs-options
   * @see https://github.com/floatdrop/gulp-plumber
   */
  function fullPipeline() {
    return vfs.src([
      '**/*',
      '!node_modules/**',
      '!source/layouts/**',
      '!source/partials/**'
    ]).pipe(plumber({errorHandler: errorHandler}));
  }

  /**
   * Handle errors that are thrown at any point in a vinyl stream lifecycle.
   *
   * @name errorHandler
   * @param {Error} err - The error object.
   */
  function errorHandler(err) {
    process.stdout.write = write;
    runner.emit('error', err);
  }

  module.exports = fullPipeline;
})();