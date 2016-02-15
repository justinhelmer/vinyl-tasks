(function() {
  'use strict';

  var expect = require('chai').expect;
  var Orchestrator = require('orchestrator');

  describe('runner', function() {
    it('should return an instance of Orchestrator', function() {
      expect(require('../lib/runner')).to.be.instanceof(Orchestrator);
    });

    it('should return the same instance when required multiple times', function() {
      var runner1 = require('../lib/runner');
      var runner2 = require('../lib/runner');
      expect(runner1).to.eq(runner2);
    });
  });
})();