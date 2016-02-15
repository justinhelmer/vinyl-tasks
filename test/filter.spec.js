(function() {
  'use strict';

  var chai = require('chai');
  var expect = chai.expect;
  var requireSubvert = require('require-subvert')(__dirname);
  var sinon = require('sinon');
  var filter, filterName, filterResult, gFilter, options, pattern, sandbox;

  chai.use(require('dirty-chai'));
  chai.use(require('sinon-chai'));

  describe('filter', function() {
    beforeEach(function() {
      filterName = 'foo';
      pattern = 'PATTERN';
      options = {};
      sandbox = sinon.sandbox.create();
      filterResult = {restore: 'RESTORE'};

      gFilter = sandbox.stub().returns(filterResult);
      requireSubvert.subvert('gulp-filter', gFilter);

      filter = requireSubvert.require('../lib/filter');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should return a function', function() {
      expect(filter(filterName, pattern, options)).to.be.a('function');
    });

    describe('when invoking the function returned by filter()', function() {
      it('should create a gulp filter with the supplied args', function() {
        filter(filterName, pattern, options)();
        expect(gFilter).to.have.been.calledWithExactly(pattern, options);
      });

      it('should return the filter created by gulp-filter', function() {
        expect(filter(filterName, pattern, options)()).to.eq(filterResult);
      });
    });

    describe('filter.restore', function() {
      it('should return a function', function() {
        expect(filter.restore()).to.be.a('function');
      });

      describe('when invoking the function returned by filter.restore()', function() {
        it('should return the "restore" method of the registered filter', function() {
          filter(filterName, pattern, options)();
          expect(filter.restore(filterName)()).to.eq(filterResult.restore);
        });
      });
    });
  });
})();