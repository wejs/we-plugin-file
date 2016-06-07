var assert = require('assert')
var request = require('supertest')
var helpers = require('we-test-tools').helpers
var stubs = require('we-test-tools').stubs
var fs = require('fs')
var http
var we, _

describe('fileFeature', function () {
  var salvedFile;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    _ = we.utils._;
    // upload one stub image:
    request(http)
    .post('/api/v1/file')
    .attach('file', stubs.getImageFilePath())
    .expect(201)
    .end(function (err, res) {
      if (err) {
        console.log('res.text>', res.text)
        throw err;
      }
      salvedFile = res.body.file;
      done(err);
    });
  });

  describe('create', function () {
    // file upload and creation is slow then set to 300
    this.slow(300);

    it('post /api/v1/file create one file record', function(done) {
      request(http)
      .post('/api/v1/file')
      .attach('file', stubs.getImageFilePath())
      .expect(201)
      .end(function (err, res) {
        if(err) throw err

        assert(res.body.file)
        assert(res.body.file.mime)
        done()
      });
    });
  });

  describe('findOne', function () {
    it('get /api/v1/file/:id should return one file data', function (done){
      request(http)
      .get('/api/v1/file/' + salvedFile.id)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.log('res.text>', res.text)
          return done(err)
        }

        assert(res.body.file.id, salvedFile.id)

        done()
      });
    });
  });

  describe('findOne', function () {
    it('get /api/v1/file/:id should return one file data', function (done){
      request(http)
      .get('/api/v1/file-download/' + salvedFile.name)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.log('res.text>', res.text)
          return done(err)
        }

        assert.equal(res.type, salvedFile.mime)
        assert(res.body)

        done()
      });
    });
  });

  describe('remove', function () {
    it('delete /api/v1/file/:name should delete one file', function (done) {
      var salvedFile;

      request(http)
      .post('/api/v1/file')
      .attach('file', stubs.getImageFilePath())
      .expect(201)
      .end(function (err, res) {
        if (err) {
          console.log('res.text>', res.text)
          throw err;
        }
        salvedFile = res.body.file;

        request(http)
        .delete('/api/v1/file/'+salvedFile.name)
        .expect(204)
        .end(function (err, res) {
          if (err) {
            console.log('res.text>', res.text)
            throw err;
          }


          var storage = we.config.upload.storages[salvedFile.storageName];

          var path = storage.getPath(salvedFile.style, salvedFile.name)

          fs.exists(path, function afterCheckIfFileExists(exists) {
            assert(!exists)

            done();
          })
        });
      });
    });
  });
});
