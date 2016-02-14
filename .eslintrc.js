(function() {
  'use strict';

  module.exports = {
    extends: 'google',
    env: {
      mocha: true
    },
    plugins: ['mocha'],
    rules: {
      'max-len': [2, 150, 2],
      'mocha/handle-done-callback': 2,
      'mocha/no-exclusive-tests': 2,
      'mocha/no-global-tests': 2
    }
  };
})();

