/**
 * Image model
 *
 * @module      :: Model
 *
 */
var fs = require('fs');
var gm = require('gm');
var mkdirp = require('mkdirp');

module.exports = function ImageModel(we) {
  var _ = we.utils._;
  var async = we.utils.async;

  // set sequelize model define and options
  var model = {
    definition: {
      // - user given data text
      label: { type: we.db.Sequelize.STRING },
      description: { type: we.db.Sequelize.TEXT },
      // - data get from file
      name: {
        type: we.db.Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      size: { type: we.db.Sequelize.INTEGER },
      encoding: { type: we.db.Sequelize.STRING },

      active: { type: we.db.Sequelize.BOOLEAN, defaultValue: true },

      originalname: { type: we.db.Sequelize.STRING },
      mime: { type: we.db.Sequelize.STRING },
      extension: { type: we.db.Sequelize.STRING },
      width: { type: we.db.Sequelize.STRING },
      height: { type: we.db.Sequelize.STRING }
    },
    associations: {
      creator: { type: 'belongsTo', model: 'user' }
    },
    options: {

      // table comment
      comment: 'We.js image table',

      classMethods: {
        getStyleUrlFromImage: function(image) {
          return {
            original: we.config.hostname + '/api/v1/image/original/' + image.name,
            thumbnail: we.config.hostname + '/api/v1/image/thumbnail/' + image.name,
            mini: we.config.hostname + '/api/v1/image/mini/' + image.name,
            medium: we.config.hostname + '/api/v1/image/medium/' + image.name,
            large: we.config.hostname + '/api/v1/image/large/' + image.name
          };
        },

        /**
         * Get image styles
         *
         * @return {object} avaible image styles
         */
        getImageStyles: function getImageStyles() {
          return we.config.upload.image.avaibleStyles;
        },

        getImagePath: function getImagePath(imageStyle, fileName) {
          if (!imageStyle) imageStyle = 'original';
          return we.config.upload.image.uploadPath + '/'+ imageStyle +'/' + fileName;
        },

        getFileOrResize: function getFileOrResize(fileName, imageStyle, callback) {
          var path = we.db.models.image.getImagePath(imageStyle, fileName);

          fs.readFile(path, function (err, contents) {
            if (err) {
              if (err.code !== 'ENOENT' || imageStyle === 'original' ) {
                return callback(err);
              }

              var originalFile =  we.db.models.image.getImagePath('original', fileName);

              var width = we.config.upload.image.styles[imageStyle].width;
              var heigth = we.config.upload.image.styles[imageStyle].heigth;

              // resize and remove EXIF profile data
              gm(originalFile)
              .resize(width, heigth)
              .noProfile()
              .write(path, function (err) {
                if (err) return callback(err);
                fs.readFile(path, function (err, contents) {
                  callback(null, contents);
                });
              });

            } else {
              callback(null, contents);
            }
          });
        },

        /**
         * Resize one image in server and retur size
         *
         * @param  {strinh}   originalFile
         * @param  {object}   cords
         * @param  {Function} cb           callback
         */
        resizeImageAndReturnSize: function(originalFile, cords, cb) {
          gm(originalFile).crop(cords.width, cords.height, cords.x, cords.y)
          .write(originalFile, function (err) {
            if (err) {
              we.log.error('Error on crop file:', originalFile, cords, err);
              return cb(err);
            }
            // get image size
            gm(originalFile).size(function (err, size) {
              if (err) return cb(err);
              return cb(null,size);
            });
          });
        },

        /**
         * Delete old image styles for one image
         * @param  {string}   imageName
         * @param  {Function} callback
         */
        deleteImageStylesWithImageName: function(imageName, callback){
          var imageStyles = we.db.models.image.getImageStyles();
          async.each(imageStyles,function(style, next){
            var path = we.db.models.image.getImagePath(style, imageName);
            fs.exists(path, function(exists) {
              we.log.verbose(path, exists);
              if (exists) {
                fs.unlink(path, function (err) {
                  if (err) throw err;
                  next();
                });
              } else {
                next();
              }
            });
          },callback);
        }
      },

      instanceMethods: {
        toJSON: function() {
          var obj = this.get();
          obj.urls = we.db.models.image.getStyleUrlFromImage(obj);
          return obj;
        }
      }
    }
  }

  we.hooks.on('we:create:default:folders', function (we, done) {
    // create image upload path
    mkdirp(we.config.upload.image.uploadPath, function (err) {
      if (err) we.log.error('Error on create image upload path', err);

      var imageStyles = we.db.models.image.getImageStyles();

      async.each(imageStyles, function (style, next) {
        var imageDir = we.config.upload.image.uploadPath + '/' + style;
        fs.lstat(imageDir, function (err) {
          if (err) {
            if (err.code === 'ENOENT') {
              we.log.info('Creating the image upload directory: ' + imageDir);
              return mkdirp(imageDir, function (err) {
                if (err) we.log.error('Error on create upload path', err);
                return next();
              });
            }
            we.log.error('Error on create image dir: ', imageDir);
            return next(err);
          } else {
            next();
          }
        });
      }, done);
    })
  });


  // use before instance to set sequelize virtual fields for term fields
  we.hooks.on('we:models:before:instance', function (we, done) {
    var f, cfgs;
    var models = we.db.modelsConfigs;

    for (var modelName in models) {
      if (models[modelName].options && models[modelName].options.imageFields) {

        for (f in models[modelName].options.imageFields) {
          if (models[modelName].definition[f]) {
            we.log.verbose('Field already defined for image field:', f);
            continue;
          }
          // set field configs
          cfgs = _.clone(models[modelName].options.imageFields[f]);
          cfgs.type = we.db.Sequelize.VIRTUAL;
          // set virtual setter
          cfgs.set = getFieldSetter(f, cfgs);
          // set virtual getter
          cfgs.get = getFieldGetter(f, cfgs);
          // set form field html
          if (cfgs.formFieldMultiple) {
            cfgs.formFieldType = 'file/images';
          } else {
            cfgs.formFieldType = 'file/image';
          }
          // set virtual fields for term fields if not exists
          models[modelName].definition[f] = cfgs;
        }
      }
    }

    done();
  });

   // after define all models add term field hooks in models how have terms
  we.hooks.on('we:models:set:joins', function (we, done) {
    var models = we.db.models;
    for (var modelName in models) {
      var imageFields = we.file.image.getModelImageFields(
        we.db.modelsConfigs[modelName]
      );

      if ( _.isEmpty(imageFields) ) continue;

      models[modelName].addHook('afterFind', 'loadImages', we.file.image.afterFind);
      models[modelName].addHook('afterCreate', 'createImage', we.file.image.afterCreatedRecord);
      models[modelName].addHook('afterUpdate', 'updateImage', we.file.image.afterUpdatedRecord);
      models[modelName].addHook('afterDestroy', 'destroyImage', we.file.image.afterDeleteRecord);
    }

    done();
  });

  we.events.on('we:after:load:plugins', function (we) {
    if (!we.file) we.file = {};
    if (!we.file.image) we.file.image = {};
    var db = we.db;

    we.file.image.getModelImageFields = function getModelImageFields(Model) {
      if (!Model.options || !Model.options.imageFields) return null;
      return Model.options.imageFields;
    }

    we.file.image.afterFind = function afterFind(r, opts, done) {
      var Model = this;
      if ( _.isArray(r) ) {
        async.eachSeries(r, function (r1, next) {
          // we.db.models.imageassoc
          we.file.image.afterFindRecord.bind(Model)(r1, opts, next);
        }, done);
      } else {
        we.file.image.afterFindRecord.bind(Model)(r, opts, done) ;
      }
    }
    we.file.image.afterFindRecord = function afterFindRecord(r, opts, done) {
      var functions = [];
      var Model = this;
      // found 0 results
      if (!r) return done();

      var fields = we.file.image.getModelImageFields(this);
      if (!fields) return done();

      if (!r._salvedImages) r._salvedImages = {};
      if (!r._salvedImageAssocs) r._salvedImageAssocs = {};

      var fieldNames = Object.keys(fields);
      // for each field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.imageassoc.findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            include: [{ all: true }]
          }).then(function (imgAssocs) {
            if (_.isEmpty(imgAssocs)) return next();

            r._salvedImages = imgAssocs.map(function (imgAssoc) {
              return imgAssoc.image.toJSON();
            });

            r.setDataValue(fieldName, r._salvedImages);
            // salved terms cache
            r._salvedImageAssocs[fieldName] = imgAssocs;
            return next();
          }).catch(next);
        });
      });

      async.parallel(functions, done);
    }
    // after create one record with image fields
    we.file.image.afterCreatedRecord = function afterCreatedRecord(r, opts, done) {
      var functions = [];
      var Model = this;

      var fields = we.file.image.getModelImageFields(this);
      if (!fields) return done();

      var imageFields = Object.keys(fields);

      if (!r._salvedImages) r._salvedImages = {};
      if (!r._salvedImageAssocs) r._salvedImageAssocs = {};

      imageFields.forEach(function (fieldName) {
        var values = r.get(fieldName);
        if (_.isEmpty(values)) return;

        var imagesToSave = [];
        var newImageAssocs = [];

        functions.push(function (nextField) {
          async.each(values, function (value, next) {
            if (!value || (value == 'null') ) return next();

            // check if the image exists
            db.models.image.find({
              where:{ id: value.id || value }
            }).then(function (i) {
              if (!i) return next();

              db.models.imageassoc.create({
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                imageId: value.id || value
              }).then(function (r) {
                we.log.verbose('Image assoc created:', r.id);

                imagesToSave.push(i);
                newImageAssocs.push(r);

                next();
              }).catch(next);
            }).catch(next);
          }, function (err) {
            if (err) return nextField(err);

            r._salvedImageAssocs[fieldName] = newImageAssocs;
            r._salvedImages[fieldName] = imagesToSave;
            r.setDataValue(fieldName, imagesToSave.map(function (im) {
              return im.toJSON();
            }));

            nextField();
          });
        });
      });
      async.series(functions, done);
    }
    // after update one record with image fields
    we.file.image.afterUpdatedRecord = function afterUpdatedRecord(r, opts, done) {
      var Model = this;

      var fields = we.file.image.getModelImageFields(this);
      if (!fields) return done();

      var fieldNames = Object.keys(fields);
      async.eachSeries(fieldNames, function (fieldName, nextField) {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField();

        var imagesToSave = _.clone( r.get(fieldName) );
        var newImageAssocs = [];
        var newImageAssocsIds = [];

        async.series([
          function findOrCreateAllAssocs (done) {
            var preloadedImagesAssocsToSave = [];

            async.each(imagesToSave, function (its, next) {
              if (_.isEmpty(its) || its == 'null') return next();

              var values = {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                imageId: its.id || its
              };
              // check if this image exits
              db.models.image.find({
                where:{ id: its.id || its }
              }).then(function (i) {
                if (!i) return done();
                // find of create the assoc
                db.models.imageassoc.findOrCreate({
                  where: values, defaults: values
                }).then(function (r) {
                  r[0].image = i;
                  preloadedImagesAssocsToSave.push(r[0]);
                  next();
                }).catch(done);
              });
            }, function (err) {
              if (err) return done(err);

              imagesToSave = preloadedImagesAssocsToSave.map(function (r) {
                newImageAssocsIds.push(r.id);
                return r.image;
              });

              newImageAssocs = preloadedImagesAssocsToSave;
              done();
            });
          },
          // delete removed image assocs
          function deleteAssocs(done) {
            var query = { where: {
              modelName: Model.name, modelId: r.id, field: fieldName
            }}

            if (!_.isEmpty(newImageAssocsIds)) query.where.id = { $notIn: newImageAssocsIds };

            db.models.imageassoc.destroy(query).then(function (result) {
              we.log.verbose('Result from deleted image assocs: ', result, fieldName, Model.name);
              done();
            }).catch(done);
          },
          function setRecorValues(done) {
            r._salvedImages[fieldName] = imagesToSave;
            r._salvedImageAssocs[fieldName] = newImageAssocs;
            r.setDataValue(fieldName, imagesToSave.map(function (im) {
              return im.toJSON();
            }));
            done();
          }
        ], nextField);
      }, done);
    }
    // delete the image associations after delete related model
    we.file.image.afterDeleteRecord = function afterDeleteRecord (r, opts, done) {
      var Model = this;

      db.models.imageassoc.destroy({
        where: { modelName: Model.name, modelId: r.id }
      }).then(function (result) {
        we.log.debug('Deleted ' + result + ' image assocs from record with id: ' + r.id);
        return done();
      }).catch(done);
    }
  });

  /**
   * Get sequelize image field getter function
   *
   * @param  {String} fieldName
   * @return {Function}
   */
  function getFieldSetter(fieldName) {
    return function setImages(val) {
      if (_.isArray(val)) {
        var newVal = [];
        // skip flags and invalid values
        for (var i = 0; i < val.length; i++) {
          if (val[i] && val[i] !== 'null') newVal.push(val[i]);
        }
        this.setDataValue(fieldName, newVal);
      } else if (val) {
        // skip flags and invalid values
        if (val && val !== 'null') this.setDataValue(fieldName, [val]);
      }
    }
  }

  /**
   * Get sequelize image field setter function
   *
   * @param  {String} fieldName
   * @return {Function}
   */
  function getFieldGetter(fieldName) {
    return function getImages() {
      // return the value or a empty array
      return this.getDataValue(fieldName) || [];
    }
  }

  return model;
}