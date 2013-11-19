/*
 * grunt-transfo
 * https://github.com/nopnop/grunt-transfo
 *
 * Copyright (c) 2013 Jean Ponchon
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    test_vars: {
      name: 'grunt-contrib-copy',
      version: '0.1.0',
      match: 'folder_one/*',
      banner_property: 'AWESOME',
    },


    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        'tasks/lib/*.js',
        '<%= nodeunit.copy %>',
        '<%= nodeunit.concat %>',
        '<%= nodeunit.transfo %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      transfo: ['tmp_transfo', 'tmp_transfo_copy', 'tmp_transfo_concat'],
      copy:    ['tmp_copy'],
      concat:  ['tmp_concat'],
    },

    // Configuration to be run (and then tested).
    transfo: {

      // Copy tasks
      main: {
        files: [
          {expand: true, cwd: 'test/copy/fixtures', src: ['*.*'], dest: 'tmp_transfo_copy/copy_test_files/'},
          {expand: true, cwd: 'test/copy/fixtures', src: ['**'], dest: 'tmp_transfo_copy/copy_test_mix/'},
          {expand: true, cwd: 'test/copy/fixtures', src: ['<%= test_vars.match %>'], dest: 'tmp_transfo_copy/copy_test_v<%= test_vars.version %>/'}
        ]
      },

      flatten: {
        files: [
          {expand: true, flatten: true, filter: 'isFile', src: ['test/copy/fixtures/**'], dest: 'tmp_transfo_copy/copy_test_flatten/'}
        ]
      },

      single: {
        files: [
          {src: ['test/copy/fixtures/test.js'], dest: 'tmp_transfo_copy/single.js'}
        ]
      },

      verbose: {
        files: [
          {expand: true, src: ['test/copy/fixtures/**'], dest: 'tmp_transfo_copy/copy_test_verbose/'}
        ]
      },

      mode: {
        options: {
          mode: '0444',
        },
        src: ['test/copy/fixtures/test2.js'],
        dest: 'tmp_transfo_copy/mode.js',
      },


      // Concat tasks
      default_options: {
        files: {
          'tmp_transfo_concat/default_options': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },
      custom_options: {
        options: {
          separator: '\n;\n',
          banner: '/* THIS TEST IS <%= test_vars.banner_property %> */\n',
          footer: 'dude'
        },
        files: {
          'tmp_transfo_concat/custom_options': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },
      handling_invalid_files: {
        src: ['test/concat/fixtures/file1', 'invalid_file/should_warn/but_not_fail', 'test/concat/fixtures/file2'],
        dest: 'tmp_transfo_concat/handling_invalid_files',
        nonull: true,
      },
      process_function: {
        options: {
          process: function(src, filepath) {
            return '// Source: PROCESS\n' +
              src.replace(/file(\d)/, 'f$1');
          }
        },
        files: {
          'tmp_transfo_concat/process_function': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },


    },


    // From grunt-contrib-copy test

    // Configuration to be run (and then tested).
    copy: {
      main: {
        files: [
          {expand: true, cwd: 'test/copy/fixtures', src: ['*.*'], dest: 'tmp_copy/copy_test_files/'},
          {expand: true, cwd: 'test/copy/fixtures', src: ['**'], dest: 'tmp_copy/copy_test_mix/'},
          {expand: true, cwd: 'test/copy/fixtures', src: ['<%= test_vars.match %>'], dest: 'tmp_copy/copy_test_v<%= test_vars.version %>/'}
        ]
      },

      flatten: {
        files: [
          {expand: true, flatten: true, filter: 'isFile', src: ['test/copy/fixtures/**'], dest: 'tmp_copy/copy_test_flatten/'}
        ]
      },

      single: {
        files: [
          {src: ['test/copy/fixtures/test.js'], dest: 'tmp_copy/single.js'}
        ]
      },

      verbose: {
        files: [
          {expand: true, src: ['test/copy/fixtures/**'], dest: 'tmp_copy/copy_test_verbose/'}
        ]
      },

      mode: {
        options: {
          mode: '0444',
        },
        src: ['test/copy/fixtures/test2.js'],
        dest: 'tmp_copy/mode.js',
      },
    },


    // From grunt-contrib-concat test

    // Configuration to be run (and then tested).
    concat: {
      default_options: {
        files: {
          'tmp_concat/default_options': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },
      custom_options: {
        options: {
          separator: '\n;\n',
          banner: '/* THIS TEST IS <%= test_vars.banner_property %> */\n',
          footer: 'dude'
        },
        files: {
          'tmp_concat/custom_options': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },
      handling_invalid_files: {
        src: ['test/concat/fixtures/file1', 'invalid_file/should_warn/but_not_fail', 'test/concat/fixtures/file2'],
        dest: 'tmp_concat/handling_invalid_files',
        nonull: true,
      },
      process_function: {
        options: {
          process: function(src, filepath) {
            return '// Source: PROCESS\n' +
              src.replace(/file(\d)/, 'f$1');
          }
        },
        files: {
          'tmp_concat/process_function': ['test/concat/fixtures/file1', 'test/concat/fixtures/file2']
        }
      },
    },


    // Unit tests.
    nodeunit: {
      copy:    ['test/copy_test.js'],
      concat:  ['test/concat_test.js'],
      transfo: ['test/transfo_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'transfo', 'copy', 'concat', 'nodeunit']);
  grunt.registerTask('test_copy', ['clean:copy', 'copy', 'nodeunit:copy']);
  grunt.registerTask('test_concat', ['clean:concat', 'concat', 'nodeunit:concat']);
  grunt.registerTask('test_transfo', ['clean:transfo', 'transfo', 'nodeunit:transfo']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
