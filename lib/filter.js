(function() {
  'use strict';

  var filters = {};
  var gFilter = require('gulp-filter');

  /**
   * Creates a filter function that filters a vinyl stream when invoked. Additionally stores the filter in memory
   * for use with filter.restore.
   *
   * @name filter
   * @param {string} filterName - The name of the filter to create. Should be namespaced to avoid collisions.
   * @param {*} pattern - The source glob pattern(s) to filter the vinyl stream.
   * @param {object} [options] - The additional options to pass to gulp-filter.
   * @returns {function} - The partial that generates the vinyl filter when invoked.
   * @see https://github.com/sindresorhus/gulp-filter
   */
  function filter(filterName, pattern, options) {
    return function() {
      options = options || {};
      filters[filterName] = gFilter(pattern, options);
      return filters[filterName];
    };
  }

  /**
   * Restore a filter that was created through the filter() interface. Does not sanity check that the filter exists.
   *
   * @name restoreFilter
   * @param {string} filterName - The name of the filter to restore. must already exist.
   * @see https://github.com/sindresorhus/gulp-filter
   */
  function restoreFilter(filterName) {
    return function() {
      return filters[filterName].restore;
    };
  }

  filter.restore = restoreFilter;
  module.exports = filter;
})();