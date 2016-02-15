(function() {
  'use strict';

  var _ = require('lodash');
  var chai = require('chai');
  var expect = chai.expect;
  var sinon = require('sinon');
  chai.use(require('sinon-chai'));

  var create = require('../lib/create');
  var filter = require('../lib/filter');
  var pipeline = require('../lib/pipeline');
  var tasks = require('../');

  describe('vinyl-tasks (exported module)', function() {
    it('should export an object with a reference to all public interfaces', function() {
      expect(_.keys(tasks)).to.eql(['create', 'filter', 'pipeline']);
      expect(tasks.create).to.eq(create);
      expect(tasks.filter).to.eq(filter);
      expect(tasks.pipeline).to.eq(pipeline);
    });
  });
})();