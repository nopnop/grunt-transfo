/*
 * grunt-transfo
 * https://github.com/nopnop/grunt-transfo
 *
 * Copyright (c) 2013 Jean Ponchon
 * Licensed under the MIT license.
 */
'use strict';

module.exports = function(grunt) {

  // External dependencies
  var _            = require('underscore');
  var async        = require('async');
  var bun          = require('bun');
  var dirname      = require('path').dirname;
  var fs           = require('fs');
  var mkdirp       = require('mkdirp');
  var path         = require('path');
  var Q            = require('q');
  var rimraf       = require('rimraf');
  var StreamStream = require('stream-stream');
  var through2     = require('through2');

  // Utils
  var isDir        = require('./lib/utils').isDir;
  var isFile       = require('./lib/utils').isFile;
  var fileUID      = require('./lib/utils').fileUID;
  var strToStream  = require('./lib/utils').strToStream;

  // grunt-contrib-copy util
  var unixifyPath  = require('./lib/unixifypath');

  // grunt-contrib-concat comment remover
  var comment      = require('./lib/comment').init(grunt);

  // Transfo options
  var defaultOptions = {

    // For grunt-contrib-concat compatibility
    process: false,
    stripBanners: false,
    separator: grunt.util.linefeed,
    banner: '',
    footer: '',

    // For grunt-contrib-copy compatibility
    processContent: false,
    processContentExclude: [],
    mode: parseInt('0777', 8) & (~process.umask()),


    // How many files to proceed simultaneously ?
    concurrency: 1,

    // A list of transform function that
    // must return a readable-writable stream v2
    // (see stream.Transform or through2)
    //
    // Each function receive :
    // - src: the source filepath
    // - dest: the destination filepath
    // - options: a copy of current task options
    transforms: [],

    // Same of options.transform for the concatenated stream
    transformsConcat: [],

    // Do nothing if the destination file already exist with an equal
    // or posterior mtime
    lazy: false,

    // Temporary folder to write concat build
    // This folder must be added to any clean task
    // when used with 'lazy' mode
    cache: 'tmp/transfo/',
  };


  // Grunt task
  grunt.registerMultiTask('transfo', 'Streamed copy and/or concat with stream transformation pipeline  (compatible with contrib-copy/concat)', function() {
    // No files ?
    if(!this.files.length) {
      return true;
    }

    // This task is async
    var done      = this.async();

    // Promise for processing steps
    var defCopy   = Q.defer();
    var defConcat = Q.defer();

    // Storage for processing

    // All resolved destination as key with one or
    // many resolved sources (for concatenation)
    var destSources    = {};

    // For each destination that is a concatenation
    // the list of cached sources transformed before
    // concatenation
    var concatSources  = {};

    // A promise for each cached source ready for
    // concatenation. If the promise value is true
    var concatPromises = {};

    // Extend options
    var options   = this.options(defaultOptions);
    grunt.verbose.writeflags(options, 'Options');

    // Log
    var tally = {
      dirs: 0,
      files: 0,
      concats: 0,
      useCached: 0
    };


    // ------------------------------------------------




    /**
     * Add one or many sources to proceed to destination
     *
     * @param {Array} sources
     *        Array of source path
     *
     * @param {String} dest
     *        Destination path
     *
     * @param {Object} options
     *        Transfo options object
     *
     * @return {Promise} TODO
     */
    function addToQueueCopy(sources, dest, options) {
      if(sources.length === 1) {
        // Simple copy
        queueCopy.push({
          src:      sources[0],
          dest:     dest,
          options:  _.extend({}, options, { concatTo: dest, isConcat: false })
        });
      } else {
        // Concat
        sources.forEach(function(src) {

          var def       = Q.defer();
          var cacheDest = path.join(options.cache, fileUID(src));

          if(!concatPromises[dest]) {
            concatPromises[dest] = [];
          }
          concatPromises[dest].push(def.promise);

          if(!concatSources[dest]) {
            concatSources[dest] = [];
          }
          concatSources[dest].push(cacheDest);

          queueCopy.push({
            src:      src,
            dest:     cacheDest,
            options:  _.extend({}, options, { concatTo: dest, isConcat: true })
          }, function(err, changed) {
            if(err) {
              return def.reject(err);
            }
            def.resolve(changed);
          });
        });
      }
    }

    /**
     * Processing method executed for each file using an async queue
     *
     * @param  {Object}   task
     *         Task object for copyQueue
     *
     * @param  {Function} done
     *         Standard async callback return true if the file as been
     *         processed, and false if the lazy mode prevent
     *         any action (the file exist)
     */
    function proceedCopyTask(task, done) {
      var src                   = task.src;
      var dest                  = task.dest;
      var options               = task.options;
      var lazy                  = options.lazy;
      var transforms            = options.transforms.slice(0);
      var process               = options.process;
      var processContent        = options.processContent;
      var processContentExclude = options.processContentExclude;
      var stripBanners          = options.stripBanners;
      var mode                  = options.mode;
      var isConcat              = options.isConcat;
      var statSrc, statDest;

      // Banner and footer if any and if not applyed during concatenation
      var banner                = isConcat ? false : options.banner || false;
      var footer                = isConcat ? false : options.footer || false;

      // Compatibility with grunt-contrib-copy
      // Support for the processContent function
      if(processContent && processContentExclude !== true) {
        transforms.push(function(src, dest) {
          var body = [], result;

          // Check for exclusion
          if( processContentExclude && grunt.file.isMatch(processContentExclude, src)) {
            return through2();
          }

          // Else concat content and execute processContent
          return through2(
            function (buf, enc, cb) {
              body.push(buf.toString());
              cb();
            },
            function (cb) {
              body   = body.join('');
              result = processContent( body, src, dest, _.extend({}, options), addToQueueCopy);
              this.push(_.isString(result) ? result : body);
              cb();
          });

        });
      }

      // Compatibility with grunt-contrib-concat
      // Support for the process & stripBanners function
      if(process || stripBanners) {
        if (process === true) { process = {}; }
        transforms.push(function(src, dest) {
          // Else concat content and execute processContent
          var body = [], result;

          return through2(
            function (buf, enc, cb) {
              body.push(buf.toString());
              cb();
            },
            function end(cb) {
              result = body = body.join('');
              if (typeof process === 'function') {
                result = process( body, src, dest, _.extend({}, options), addToQueueCopy);
              } else if (process) {
                result = grunt.template.process(body, process);
              }

              // Strip banners if requested.
              if (stripBanners) {
                result = comment.stripBanner(result, stripBanners);
              }
              this.push(result);
              cb();
          });

        });
      }

      grunt.verbose.writeln('Transform %s -> %s', src.blue, dest.blue);

      async.series([

        // Get src and dest stat asynchronously
        function(next) {
          async.map([src,dest], function(path, done) {
            fs.stat(path, function(err, stat) {
              done(null, stat); // Ignore error
            });
          },
          function(err, results) {
            statSrc  = results[0];
            statDest = results[1];
            if(!statSrc) {
              // src is needed
              next(new Error('File not found: ' + src));
            }
            // Ignore anything that is not directory or file
            if(!(statSrc.isFile() || statSrc.isDirectory())) {
              grunt.verbose.writeln('  Ignore:'+' Source is not a file or a directory.'.grey);
              return done(null, false);
            }

            next();
          });
        },

        // Ignore file processing if the destination allready
        // exist with an equal or posterior mtime
        function(next) {
          if(!statDest || !lazy) {
            return next();
          }
          if(statDest.mtime.getTime() >= statSrc.mtime.getTime()) {
            tally.useCached++;
            grunt.verbose.writeln('  Ignore %s:'+' Destination file is allready transformed (See options.lazy).'.grey, src.blue);
            // Leave proceed
            return done(null, false);
          } else {
            next();
          }
        },

        // Conditionnaly remove destination if
        // src / dest differ in type
        function(next) {
          if(
            !statDest ||
            (statSrc.isFile() && statDest.isFile()) ||
            (statSrc.isDirectory() && statDest.isDirectory())
          ) {
            return next();
          } else {
            grunt.verbose.writeln('  Remove destination %s:'+' Source and destination are not of the same type.'.grey, dest.blue);
            // else remove destination first:
            dirExists[dest] = false;
            rimraf(dest, next);
          }
        },

        // Make directory
        function(next) {

          var dir = statSrc.isDirectory() ? dest : dirname(dest);

          // Make directory and leave proceed
          if(statSrc.isDirectory()) {
            // Juste make directory and leave proceed:
            if(statDest || dirExists[dir]) {
              return done(null, false);
            }
            grunt.verbose.writeln('  Make directory %s', dir.blue);
            mkdirp(dir, function(err) {
              if(err) {
                return next(err);
              }
              tally.dirs++;
              dirExists[dir] = true;
              return done(null, true);
            });

          // Make file's parent directory and go next
          } else {
            if(dirExists[dir]) {
              return next();
            }
            grunt.verbose.writeln('  Make directory %s', dir.blue);
            mkdirp(dir, function(err) {
              if(err) {
                return next(err);
              }
              tally.dirs++;
              dirExists[dir] = true;
              return next();
            });
          }
        },


        // Run copy
        function(next) {
          var wait = 0;
          function _exec() {
            if(writtingFiles[dest]) {
              // Try leater
              grunt.verbose.writeln('  ... wait for %s before writing (%s)', dest, wait++);
              return setImmediate(_exec);
            }

            writtingFiles[dest] = true;

            // Create the transformation pipeline
            var trans = [], transStream = through2();
            tally.files++;
            // Each transform builder is called and combined in
            // one readable/writable stream using stream-combiner
            if(transforms && transforms.length) {
              trans = _(transforms)
              // Call each tranform stream builder
              .map(function(f) {
                return f(src, dest, _.extend({}, options), addToQueueCopy);
              })
              // Keep only stream (ignore anything without a pipe() method)
              .filter(function(s) {
                return s && s.pipe;
              });
              transStream = bun(trans);
            }

            var mainStream    = new StreamStream();
            var bodyStream    = fs.createReadStream(src);
            var writeStream   = fs.createWriteStream(dest, {mode: mode});

            grunt.verbose.writeln(
              '  read(%s) -> transform(count:%s) -> write(%s)',
              src.blue,
              trans.length.toString().blue,
              dest.blue
            );

            // pipe all together
            if(banner){
              mainStream.write(strToStream(banner));
            }

            mainStream.write(bun([bodyStream, transStream]));

            if(footer){
              mainStream.write(strToStream(footer));
            }

            mainStream.end();

            // Write out
            mainStream.pipe(writeStream);

            mainStream.on('error', function(error) {
              grunt.fail.fatal(error);
            });

            writeStream.once('finish', function() {
              writtingFiles[dest] = false;
              next();
            });
          }
          _exec();
        }
      ], function(err, result) {
        if(err) {
          grunt.log.error(err);
          grunt.log.writeln("Consider using a 'clean' task before running this task again");
          done(err);
        } else {
          // Finished with changes
          done(null, true);
        }
      });
    }


    /**
     * Concat many source to dest
     *
     * @param {Array} sources
     *        Array of source path
     *
     * @param {String} dest
     *        Destination path
     *
     * @param {Object} options
     *        Transfo options object
     *
     * @return {Promise} TODO
     */
    function addToQueueConcat(sources, dest, options) {
      queueConcat.push({
        src:     sources,
        dest:    dest,
        options: _.extend({}, defaultOptions, options || {})
      });
    }

    /**
     * Proceed concat tasks
     *
     * @param  {Object}   task
     *         Task object for concatQueue
     *
     * @param  {Function} done
     *         Standard async callback return true if the file as been
     *         processed, and false if the lazy mode prevent
     *         any action (the file exist)
     */
    function proceedConcatTask(task, done) {
      var sources          = task.src;
      var dest             = task.dest;
      var options          = task.options;
      var lazy             = options.lazy;
      var transformsConcat = options.transformsConcat.slice(0);
      var separator        = options.separator;
      var banner           = options.banner;
      var footer           = options.footer;
      var mode             = options.mode;
      var statSources      = {};
      var statDest;

      grunt.verbose.writeln('Concat [%s] -> %s', sources.join(',').blue, dest.blue);

      async.series([
        // All sources stats
        function(next) {
          Q.all(sources.map(function(src) {
            return Q.nfcall(fs.stat, src)
            .then(function(stat) {
              statSources[src] = stat;
            });
          }))
          .then(function() { next(); })
          .fail(function(err) {next(err);});
        },

        // Destination stats
        function(next) {
          fs.stat(dest, function(err, stat) {
            // Ignore error
            statDest = stat;
            next();
          });
        },

        // Lazy mode
        function(next) {
          // If not lazy or if destination do not exist, continue
          if(!lazy || !statDest) {
            return next();
          }

          // If any of the sources is newer than dest, then continue,
          // else, done in lazy mode
          if(_.any(statSources, function(statSrc) { return statSrc.mtime.getTime() > statDest.mtime.getTime();})) {
            next();
          } else {
            grunt.verbose.writeln('  Ignore :'+' Destination file (%s) is allready transformed (See options.lazy).'.grey, dest.blue);
            return done(null, false);
          }

        },

        // Make parent directory
        function(next) {
          // Here destination is allways a file.
          // Only the parent folder is required
          var dir = dirname(dest);
          if(dirExists[dir]) {
            return next();
          }

          grunt.verbose.writeln('  Make directory %s', dir.blue);
          mkdirp(dir, function(err) {
            if(err) {
              return next(err);
            }
            tally.dirs++;
            dirExists[dir] = true;
            return next();
          });

        },

        // Concat
        function(next) {
          var wait = 0;
          function _exec() {
            if(writtingFiles[dest]) {
              // Try leater
              grunt.verbose.writeln('  ... wait for %s before writing (%s)', dest, wait++);
              return setImmediate(_exec);
            }
            writtingFiles[dest] = true;

            var trans = [], transStream = through2();
            tally.files++;

            // Each transform builder is called and combined in
            // one readable/writable stream using stream-combiner
            if(transformsConcat && transformsConcat.length) {
              trans = _(transformsConcat)
              // Call each tranform stream builder
              .map(function(f) {
                return f(sources, dest, _.extend({}, options));
              })
              // Keep only stream (ignore anything without a pipe() method)
              .filter(function(s) { return s && s.pipe; });
              transStream = bun(trans);
            }

            var mainStream    = new StreamStream();
            var bodyStream    = new StreamStream({separator: separator});
            var writeStream   = fs.createWriteStream(dest, {mode: mode});

            // Concat each sources
            sources.forEach(function(src) {
              bodyStream.write(fs.createReadStream(src));
            });
            bodyStream.end();


            grunt.verbose.writeln(
              '  read([%s]) -> transform(count:%s) -> write(%s)',
              sources.join(',').blue,
              trans.length.toString().blue,
              dest.blue
            );

            // Pipe all together
            if(banner) {
              mainStream.write(strToStream(banner));
            }

            mainStream.write(bun([bodyStream, transStream]));

            if(footer) {
              mainStream.write(strToStream(footer));
            }

            mainStream.end();

            // Write out
            mainStream.pipe(writeStream);

            mainStream.on('error', function(error) {
              grunt.fail.fatal(error);
            });

            writeStream.once('finish', function() {
              writtingFiles[dest] = false;
              next();
            });
          }
          _exec();
        }
      ], function(err, result) {
        if(err) {
          grunt.log.error(err);
          grunt.log.writeln("Consider using a 'clean' task before running this task again");
          done(err);
        } else {
          // Finished with changes
          done(null, true);
        }
      });
    }

    // ------------------------------------------------

    // Resolve async task when all steps are done
    Q.all([defCopy.promise, defConcat.promise])
    .then(function() {
      grunt.log.write('Created ' + tally.dirs.toString().blue  + ' directorie(s)');

      grunt.log.write(', copied ' + tally.files.toString().blue + ' file(s)');

      grunt.log.write(', concatenated ' + tally.concats.toString().blue   + ' files');

      if(tally.useCached) {
        grunt.log.write(', use cache for ' + tally.useCached.toString().blue + ' files (see options.lazy)');
      }

      grunt.log.writeln('');
      done();
    })
    .fail(function(err) {
      grunt.fail.fatal(err);
      done(err);
    });

    // Cache created directory to reduce mkdir calls
    var dirExists     = {};

    // Track file currently writted to prevent concurent writing on the
    // same file (with options.concurrency value over 1)
    var writtingFiles = {};

    var queueCopy   = async.queue(proceedCopyTask, options.concurrency);
    queueCopy.drain = function() {
      defCopy.resolve();
    };

    var queueConcat = async.queue(proceedConcatTask, options.concurrency);
    queueConcat.drain = function() {
      defConcat.resolve();
    };

    // Preparare dest to source(s) array
    // If a destination hold many source then concatenation is
    // required.
    this.files.forEach(function(filePair) {
      var isExpandedPair = filePair.orig.expand || false;
      var sources = filePair.src;
      sources.forEach(function(src) {
        var dest;
        if (isDir(filePair.dest)) {
          // The destination is a directory or a file
          // resolved with the src path
          dest = (isExpandedPair) ? filePair.dest : unixifyPath(path.join(filePair.dest, src));
        } else {
          // The destination is a file
          dest = filePair.dest;
        }


        if(isDir(dest) !== isDir(src)) {
          src = src + '/';
        }

        if (!grunt.file.exists(src)) {
          grunt.log.warn('Source file "' + src + '" not found.');
          return;
        }

        if(!destSources[dest]) {
          destSources[dest] = [];
        }

        destSources[dest].push(src);
      });
    });

    // Add copy task to queueCopy
    Object.keys(destSources).forEach(function(dest) {
      var sources = destSources[dest];
      addToQueueCopy(sources, dest, options);
    });

    // addToQueueCopy() may have add concat task to
    // concatSources/concatPromise
    // When the copy queue is resolved, we can
    // start the concat queue (or resolving it if empty)
    defCopy.promise.then(function() {

      if(Object.keys(concatSources).length === 0) {
        return defConcat.resolve();
      }

      Object.keys(concatSources).forEach(function(dest) {
        var sources = concatSources[dest];
        Q.all(concatPromises[dest]).then(function(results) {
          addToQueueConcat(sources, dest, options);
        });
      });

    });


  });
};