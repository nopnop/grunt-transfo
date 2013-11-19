'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.transfo = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },


  // Compatibility with grunt-contrib-copy

  copy_main: function(test) {
    'use strict';

    test.expect(3);

    var actual = fs.readdirSync('tmp_transfo/copy_test_files').sort();
    var expected = fs.readdirSync('test/copy/expected/copy_test_files').sort();
    test.deepEqual(expected, actual, 'should copy several files');

    actual = fs.readdirSync('tmp_transfo/copy_test_mix').sort();
    expected = fs.readdirSync('test/copy/expected/copy_test_mix').sort();
    test.deepEqual(expected, actual, 'should copy a mix of folders and files');

    actual = fs.readdirSync('tmp_transfo/copy_test_v0.1.0').sort();
    expected = fs.readdirSync('test/copy/expected/copy_test_v0.1.0').sort();
    test.deepEqual(expected, actual, 'should parse both dest and src templates');

    test.done();
  },

  copy_flatten: function(test) {
    'use strict';

    test.expect(1);

    var actual = fs.readdirSync('tmp_transfo/copy_test_flatten').sort();
    var expected = fs.readdirSync('test/copy/expected/copy_test_flatten').sort();
    test.deepEqual(expected, actual, 'should create a flat structure');

    test.done();
  },

  copy_single: function(test) {
    'use strict';

    test.expect(1);

    var actual = grunt.file.read('tmp_transfo/single.js');
    var expected = grunt.file.read('test/copy/expected/single.js');
    test.equal(expected, actual, 'should allow for single file copy');

    test.done();
  }



  // Compatibility with grunt-contrib-concat
};
