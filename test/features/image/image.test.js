var assert = require('assert')
var request = require('supertest')
var helpers = require('we-test-tools').helpers
var stubs = require('we-test-tools').stubs
var fs = require('fs')
var http
var we, _
var db

describe('imageFeature', function () {
  var salvedImage;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    _ = we.utils._;
    // upload one stub image:
    request(http)
    .post('/api/v1/image')
    .attach('image', stubs.getImageFilePath())
    .expect(201)
    .end(function (err, res) {
      if (err) {
        console.log('res.text>', res.text)
        throw err;
      }
      salvedImage = res.body.image;
      done(err);
    });
  });

  describe('find', function () {
    it('get /api/v1/image route should find one image', function (done) {
      request(http)
      .get('/api/v1/image')
      .expect(200)
      .end(function (err, res) {
        if(err) {
          console.log(res.text);
          throw err;
        }

        assert(res.body.image);
        assert( _.isArray(res.body.image) , 'image not is array');

        assert( res.body.image.length > 0);

        assert(res.body.meta);
        done();
      });
    });
  });

  describe('create', function () {
    // file upload and creation is slow then set to 300
    this.slow(300);

    it('post /api/v1/image create one image record', function(done) {
      request(http)
      .post('/api/v1/image')
      .attach('image', stubs.getImageFilePath())
      .expect(201)
      .end(function (err, res) {
        if(err) throw err;
        assert(res.body.image);
        assert(res.body.image.mime);
        done();
      });
    });

    it('db.models.image.create should create one image record with creator', function(done) {
      db = helpers.getDB();
      var userStub = stubs.userStub();
      var imageDataStub = stubs.imageDataStub();

      imageDataStub.urls = {}

      db.models.user.create(userStub).then(function(user) {
        //imageDataStub.creator = user.id;
        db.models.image.create(imageDataStub).then(function(image) {
          image.setCreator(user).then(function(){
            image.fetchAssociatedIds(function(err) {
              if(err) throw err;
              done();
            });
          })
        }).catch(done);
      }).catch(done);
    });
  });

  describe('findOne', function () {
    it('get /api/v1/image/:name should return one image file', function(done){
      request(http)
      .get('/api/v1/image/' + salvedImage.name)
      .attach('image', stubs.getImageFilePath())
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert.equal(res.type, salvedImage.mime);
        assert(res.body);

        done();
      });
    });
  });
  describe('remove', function () {
    it('delete /api/v1/image/:name should delete one file', function (done) {
      this.slow(300)
      var salvedFile

      request(http)
      .post('/api/v1/image')
      .attach('image', stubs.getImageFilePath())
      .expect(201)
      .end(function (err, res) {
        if (err) {
          console.log('res.text>', res.text)
          throw err;
        }
        salvedFile = res.body.image;

        request(http)
        .delete('/api/v1/image/'+salvedFile.name)
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
