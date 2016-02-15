(function() {
  'use strict';

  var expect = require('chai').expect;

  var create = require('../lib/create');
  var filter = require('../lib/filter');
  var pipeline = require('../lib/pipeline');
  var tasks = require('../');

  describe('vinyl-tasks (exported module)', function() {
    it('should export an object with a reference to all public interfaces', function() {
      expect(tasks).to.have.all.keys('create', 'filter', 'pipeline');
      expect(tasks.create).to.eq(create);
      expect(tasks.filter).to.eq(filter);
      expect(tasks.pipeline).to.eq(pipeline);
    });
  });
})();