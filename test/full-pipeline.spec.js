(function() {
  'use strict';

  var chai = require('chai');
  var expect = chai.expect;
  var requireSubvert = require('require-subvert')(__dirname);
  var runner = require('../lib/runner');
  var sinon = require('sinon');
  var vfs = require('vinyl-fs');
  var fullPipeline, pipe, plumber, result, sandbox;

  chai.use(require('sinon-chai'));

  describe('full-pipeline', function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      pipe = sandbox.stub().returns('PIPELINE');

      sandbox.stub(vfs, 'src').returns({pipe: pipe});
      plumber = sandbox.stub().returns('PLUMBER');
      requireSubvert.subvert('gulp-plumber', plumber);

      fullPipeline = requireSubvert.require('../lib/full-pipeline');
      result = fullPipeline();
    });

    afterEach(function() {
      sandbox.restore();
      requireSubvert.cleanUp();
    });

    it('should create a vinyl file stream for all applicable files', function() {
      expect(vfs.src).to.have.been.calledWithExactly([
        '**/*',
        '!node_modules/**',
        '!source/layouts/**',
        '!source/partials/**'
      ]);
    });

    it('should set up a global error handler using gulp-plumber', function() {
      expect(plumber).to.have.been.calledWithExactly({errorHandler: sinon.match.func});
    });

    it('should pipe the vinyl stream to the result of gulp-plumber', function() {
      expect(pipe).to.have.been.calledWithExactly('PLUMBER');
    });

    it('should return the full pipeline', function() {
      expect(result).to.eq('PIPELINE');
    });

    describe('when the error handler is invoked', function() {
      it('should emit the error to the orchestration layer', function() {
        var err = 'ERROR';
        sinon.stub(runner, 'emit');

        plumber.args[0][0].errorHandler(err);
        expect(runner.emit).to.have.been.calledWithExactly('error', err);
      });
    });
  });
})();