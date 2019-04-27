'use strict'

const { promisify } = require('util')

const assert = require('assert')
const fs = promisify(process.versions.electron ? require('original-fs') : require('fs'))
const os = require('os')
const path = require('path')
const rimraf = promisify(require('rimraf'))

const asar = require('..')
const compDirs = require('./util/compareDirectories')
const compFileLists = require('./util/compareFileLists')
const compFiles = require('./util/compareFiles')
const transform = require('./util/transformStream')

function assertPackageListEquals (actualList, expectedFilename) {
  return fs.readFile(expectedFilename, 'utf8')
    .then(expected => compFileLists(actualList.join('\n'), expected))
}

describe('api', function () {
  beforeEach(() => { rimraf.sync(path.join(__dirname, '..', 'tmp'), fs) })

  it('should create archive from directory', () => {
    return asar.createPackage('test/input/packthis/', 'tmp/packthis-api.asar')
      .then(() => compFiles('tmp/packthis-api.asar', 'test/expected/packthis.asar'))
  })
  if (os.platform() === 'win32') {
    it('should create archive with windows-style path separators', () => {
      asar.createPackage('test\\input\\packthis\\', 'tmp\\packthis-api.asar')
        .then(() => compFiles('tmp/packthis-api.asar', 'test/expected/packthis.asar'))
    })
  }
  it('should create archive from directory (without hidden files)', () => {
    return asar.createPackageWithOptions('test/input/packthis/', 'tmp/packthis-without-hidden-api.asar', { dot: false })
      .then(() => compFiles('tmp/packthis-without-hidden-api.asar', 'test/expected/packthis-without-hidden.asar'))
  })
  it('should create archive from directory (with transformed files)', () => {
    return asar.createPackageWithOptions('test/input/packthis/', 'tmp/packthis-api-transformed.asar', { transform })
      .then(() => compFiles('tmp/packthis-api-transformed.asar', 'test/expected/packthis-transformed.asar'))
  })
  it('should create archive from directory (with nothing packed)', () => {
    return asar.createPackageWithOptions('test/input/packthis/', 'tmp/packthis-api-unpacked.asar', { unpackDir: '**' })
      .then(() => compFiles('tmp/packthis-api-unpacked.asar', 'test/expected/packthis-all-unpacked.asar'))
      .then(() => compDirs('tmp/packthis-api-unpacked.asar.unpacked', 'test/expected/extractthis'))
  })
  it('should list files/dirs in archive', function () {
    return assertPackageListEquals(asar.listPackage('test/input/extractthis.asar'), 'test/expected/extractthis-filelist.txt')
  })
  it('should list files/dirs in archive with option', function () {
    return assertPackageListEquals(asar.listPackage('test/input/extractthis-unpack-dir.asar', { isPack: true }), 'test/expected/extractthis-filelist-with-option.txt')
  })
  it('should extract a text file from archive', function () {
    const actual = asar.extractFile('test/input/extractthis.asar', 'dir1/file1.txt').toString('utf8')
    let expected = fs.readFileSync('test/expected/extractthis/dir1/file1.txt', 'utf8')
    return compFileLists(actual, expected)
  })
  it('should extract a binary file from archive', function () {
    const actual = asar.extractFile('test/input/extractthis.asar', 'dir2/file2.png')
    const expected = fs.readFileSync('test/expected/extractthis/dir2/file2.png')
    return assert.strictEqual(actual.toString(), expected.toString())
  })
  it('should extract a binary file from archive with unpacked files', function () {
    const actual = asar.extractFile('test/input/extractthis-unpack.asar', 'dir2/file2.png')
    const expected = fs.readFileSync('test/expected/extractthis/dir2/file2.png')
    return assert.strictEqual(actual.toString(), expected.toString())
  })
  it('should extract an archive', () => {
    asar.extractAll('test/input/extractthis.asar', 'tmp/extractthis-api/')
    return compDirs('tmp/extractthis-api/', 'test/expected/extractthis')
  })
  it('should extract an archive with unpacked files', () => {
    asar.extractAll('test/input/extractthis-unpack.asar', 'tmp/extractthis-unpack-api/')
    return compDirs('tmp/extractthis-unpack-api/', 'test/expected/extractthis')
  })
  it('should extract a binary file from archive with unpacked files', function () {
    const actual = asar.extractFile('test/input/extractthis-unpack-dir.asar', 'dir1/file1.txt')
    const expected = fs.readFileSync('test/expected/extractthis/dir1/file1.txt')
    return assert.strictEqual(actual.toString(), expected.toString())
  })
  it('should extract an archive with unpacked dirs', () => {
    asar.extractAll('test/input/extractthis-unpack-dir.asar', 'tmp/extractthis-unpack-dir-api/')
    return compDirs('tmp/extractthis-unpack-dir-api/', 'test/expected/extractthis')
  })
  it('should handle multibyte characters in paths', () => {
    return asar.createPackage('test/input/packthis-unicode-path/', 'tmp/packthis-unicode-path.asar')
      .then(() => compFiles('tmp/packthis-unicode-path.asar', 'test/expected/packthis-unicode-path.asar'))
  })
  it('should extract a text file from archive with multibyte characters in path', function () {
    const actual = asar.extractFile('test/expected/packthis-unicode-path.asar', 'dir1/女の子.txt').toString('utf8')
    let expected = fs.readFileSync('test/input/packthis-unicode-path/dir1/女の子.txt', 'utf8')
    return compFileLists(actual, expected)
  })
})
