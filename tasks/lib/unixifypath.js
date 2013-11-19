/*
 * From grunt-contrib-copy
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 Chris Talkington, contributors
 * Licensed under the MIT license.
 * https://github.com/gruntjs/grunt-contrib-copy/blob/master/LICENSE-MIT
 */

'use strict';

module.exports = function (filepath) {
  if (process.platform === 'win32') {
    return filepath.replace(/\\/g, '/');
  } else {
    return filepath;
  }
};