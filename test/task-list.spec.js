(function() {
  'use strict';

  var expect = require('chai').expect;

  describe('task-list', function() {
    it('should return an instance of an array', function() {
      require('../lib/task-list').push('foo');
      require('../lib/task-list').push('bar');
      require('../lib/task-list').push('baz');
      expect(require('../lib/task-list')).to.eql(['foo', 'bar', 'baz']);
    });
  });
})();