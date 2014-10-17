var fs = require('fs');
var path = require('path');
var UINT64 = require('cuint').UINT64;

function Filesystem(src) {
  this.src = path.resolve(src);
  this.header = { files: {} };
  this.offset = UINT64(0);
}

Filesystem.prototype.searchNodeFromDirectory = function(p, create) {
  var json = this.header;
  var dirs = p.split(path.sep);
  for (var i in dirs) {
    if (dirs[i] != '.') {
      if (create && !json.files[dirs[i]]) {
        json.files[dirs[i]] = { files: {} };
      }
      json = json.files[dirs[i]];
    }
  }

  return json;
};

Filesystem.prototype.searchNodeFromPath = function(p, create) {
  p = path.relative(this.src, p);
  var name = path.basename(p);
  var node = this.searchNodeFromDirectory(path.dirname(p), create).files[name] = {};
  return node;
}

Filesystem.prototype.insertDirectory = function(p) {
  var node = this.searchNodeFromPath(p, true);
  node.files = {};
};
Filesystem.prototype.insertDirectoy = Filesystem.prototype.insertDirectory;

Filesystem.prototype.insertFile = function(p, stat) {
  // JavaScript can not precisely present integers >= UINT32_MAX.
  if (stat.size > 4294967295)
    throw new Error(p + ': file size can not be larger than 4.2GB');

  var node = this.searchNodeFromPath(p, true);
  node.size = stat.size;
  node.offset = this.offset.toString();
  if ((process.platform != 'win32') && (stat.mode & 0100))
    node.executable = true;
  this.offset.add(UINT64(stat.size));
};

Filesystem.prototype.insertLink = function(p, stat) {
  var link = path.relative(fs.realpathSync(this.src), fs.realpathSync(p));
  if (link.substr(0, 2) == '..')
    throw new Error(p + ': file links out of the package');

  var node = this.searchNodeFromPath(p, true);
  node.link = link;
}

Filesystem.prototype.listFiles = function() {
  files = [];
  var fillFilesFromHeader = function(p, json) {
    if (!json.files)
      return;
    for (f in json.files) {
      var fullPath = path.join(p, f);
      files.push(fullPath);
      fillFilesFromHeader(fullPath, json.files[f]);
    }
  };
  fillFilesFromHeader('/', this.header);
  return files;
}

Filesystem.prototype.getFile = function(p) {
  var name = path.basename(p);
  var info = this.searchNodeFromDirectory(path.dirname(p)).files[name];
  if (!info.link)
    return info;
  return this.getFile(info.link);
}

module.exports = Filesystem;
