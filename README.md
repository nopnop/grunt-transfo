# grunt-transfo

> Transfo offer both 'copy' and 'concat' task at once with the addition of streamed transformation of content and optional caching based on files mtime to limit unrequired file processing. Transfo should be used has an alternative to any grunt-contrib-copy and/or grunt-contrib-concat usage without any change in your grunt configuration (see compatibility test).

![transfo.png](https://raw.github.com/nopnop/grunt-transfo/master/transfo.png)

## Getting Started
This plugin requires Grunt `~0.4.1` and node `>= 0.10.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-transfo --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-transfo');
```

## The "transfo" task

### Overview
In your project's Gruntfile, add a section named `transfo` to the data object passed into `grunt.initConfig()`.

You can use `grunt-transfo` in place of any [grunt-contrib-copy](https://github.com/gruntjs/grunt-contrib-copy) or  [grunt-contrib-concat](https://github.com/gruntjs/grunt-contrib-concat) configuration.

```js
grunt.initConfig({
  transfo: {
    options: {
      // Any grunt-contrib-copy and/or grunt-contrib-concat options
      // Any grunt-transfo options (see below)
    },

    // Copy
    any_copy_task: {
      files: [
        {expand: true, src: ['path/**/*.js'], dest: 'build/', filter: 'isFile'}
      ]
    },

    // Concat
    any_concat_task: {
      options: {
        stripBanners: true,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */',
      },
      src: ['build/project.js','vendors/**/*.js'],
      dest: 'dist/built.js',
      expand: true
    },
  },
})
```

### Options

#### concurrency

Type: `Integer` (>= 1) • Default: 1

How many files to proceed at the same time (copy and concat are asynchronously executed).

#### transforms

Type: `Array` of `Function` • Default: `[]`

Each function is a constructor for a [Transform stream](http://nodejs.org/api/stream.html#stream_class_stream_transform). Any time a source is processed, each constructor is called with following arguments and must return a Transform stream.

`function(src, dest, options, addFiles) ... `

  - `src` {`String`}: The source file path
  - `dest` {`String`}: The destination file path
  - `options` {`Object`}:
    - *All your task options*
    - `isConcat` {`Boolean`}: This is file will be concatenated with others
  - A method to add files to the process queue. Usefull to add file detected while the transformation (expl: assets in css source):
    - `sources` {`Array|String`}: One or many path to copy / concatenate
    - `dest` {`String`}: Destination path
    - `options`: Copy/concat options (transfo options)

```js
options: {
  transforms: [
    // PassThrough ...
    function(src, dest, options) { return new stream.Transform(); }
  ]
}
```

See too [Stream Handbook](https://github.com/substack/stream-handbook) to understand why using [stream](http://nodejs.org/api/stream.html) may be very powerfull.

See too [through2](https://github.com/rvagg/through2) a nice wrapped around [stream.Transform](http://nodejs.org/api/stream.html#stream_class_stream_transform).

####  lazy

Type: `Boolean` • Default: `false`

Do nothing if the destination file already exist with an equal or posterior mtime of the source(s)

#### cache

Type: `String` • Default: `tmp/grunt-transfo`

The path to use to store lazy & concatenation cached files. Remember to add this path to your `clean` task if you plan to use the `lazy` option.

#### Any [grunt-contrib-copy options](https://github.com/gruntjs/grunt-contrib-copy#options)

  - [processContent](https://github.com/gruntjs/grunt-contrib-copy#processcontent)
  - [processContentExclude](https://github.com/gruntjs/grunt-contrib-copy#processcontentexclude)

#### Any [grunt-contrib-concat options](https://github.com/gruntjs/grunt-contrib-concat#options)

  - [separator](https://github.com/gruntjs/grunt-contrib-concat#separator)
  - [banner](https://github.com/gruntjs/grunt-contrib-concat#banner)
  - [stripBanners](https://github.com/gruntjs/grunt-contrib-concat#stripbanners)
  - [process](https://github.com/gruntjs/grunt-contrib-concat#process)

### Usage Examples

    TODO

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
