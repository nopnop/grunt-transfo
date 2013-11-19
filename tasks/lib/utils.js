/*
 * grunt-transfo
 * https://github.com/nopnop/grunt-transfo
 *
 * Copyright (c) 2013 Jean Ponchon
 * Licensed under the MIT license.
 */

'use strict';

var crypto   = require('crypto');
var resolve  = require('path').resolve;
var Readable = require('stream').Readable;
var fs       = require('fs');

/**
 * Filetype according to glob value with '/'
 */
exports.fileType = function (filepath) {
  return (filepath.substr(-1) === '/') ? 'directory' : 'file';
};

exports.isDir = function(filepath) {
  return exports.fileType(filepath) === 'directory';
};

exports.isFile = function(filepath) {
  return !exports.isDir(filepath);
};

/**
 * Create an UID for a file using absolute filepath
 * and stat.mtime
 *
 * @param  {String} filepath
 *         Resolvable filepath (the file must exists)
 *
 * @return {String}  Md5 Hash
 */
exports.fileUID = function(filepath) {
  var stat = fs.statSync(filepath);
  var hash = crypto.createHash('md5');
  hash.update(resolve(filepath) + '-' + stat.mtime);
  return hash.digest('hex');
};

/**
 * Create a readable stream from a string
 *
 * @param  {String} str
 *         String to stream
 *
 * @param  {String} encoding
 *         Default to 'utf8'
 *
 * @return {stream.Readable}
 */
exports.strToStream = function(str, encoding) {
  var rs = new Readable({encoding: encoding || 'utf8'});
  rs._read = function () {
    rs.push(str.toString());
    rs.push(null);
  };
  return rs;
};