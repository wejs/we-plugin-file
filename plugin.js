/**
 * We.js we-pluginfile plugin settings
 */
var uuid = require('node-uuid');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var async = require('async');

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  var imageMimeTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/bmp',
    'image/x-icon',
    'image/tiff'
  ];

  // set plugin configs
  plugin.setConfigs({
    clientComponentTemplates: { 'components-file': true },
    permissions: {
      'find_image': {
        'title': 'Find image',
        'description': 'Find and list images'
      },
      'crop_image': {
        'title': 'Crop image',
        'description': 'Crop image and update size data'
      },
      'upload_image': {
        'title': 'Upload image',
        'description': 'Upload and save images on server'
      },
      'delete_image': {
        'title': 'Delete image',
        'description': 'Delete one image file and data'
      }
    },
    upload: {
      image: {
        uploadPath: projectPath + '/files/uploads/images',
        avaibleStyles: [ 'mini', 'thumbnail', 'medium', 'large' ],
        styles: {
          mini: { width: '24', heigth: '24' },
          thumbnail: { width: '75', heigth: '75' },
          medium: { width: '250', heigth: '250' },
          large: { width: '640', heigth: '640' }
        }
      }
    }
  });

  // ser plugin routes
  plugin.setRoutes({
    // get logged in user avatar
    'get /avatar/:id([0-9]+)': {
      controller    : 'avatar',
      action        : 'getAvatar',
      permission    : 'find_user'
    },
    'post /api/v1/user/:id([0-9]+)/avatar': {
      controller    : 'avatar',
      action        : 'changeAvatar',
      model         : 'user',
      loadRecord    :  true,
      permission    : 'update_user'
    },
    //
    // --  Images routes
    //
    'get /api/v1/image': {
      controller    : 'image',
      action        : 'find',
      model         : 'image',
      responseType  : 'json',
      permission    : 'find_image'
    },
    'get /api/v1/image/:name': {
      controller    : 'image',
      action        : 'findOne',
      model         : 'image',
      responseType  : 'json',
      permission    : 'find_image'
    },
    // Image style thumbnail | medium | large
    'get /api/v1/image/:style(original|mini|thumbnail|medium|large)/:name': {
      controller    : 'image',
      action        : 'findOne',
      model         : 'image',
      responseType  : 'json',
      permission    : 'find_image'
    },
    'get /api/v1/image/:id([0-9]+)/data': {
      controller    : 'image',
      action        : 'findOneReturnData',
      model         : 'image',
      responseType  : 'json',
      loadRecord    :  true,
      permission    : 'find_image'
    },
    'post /api/v1/image-crop/:id([0-9]+)': {
      controller    : 'image',
      action        : 'cropImage',
      model         : 'image',
      responseType  : 'json',
      loadRecord    :  true,
      permission    : 'crop_image'
    },
    // 'delete /api/v1/image/:id([0-9]+)': {
    //   controller    : 'image',
    //   action        : 'delete',
    //   model         : 'image',
    //   responseType  : 'json',
    //   permission    : 'delete_image'
    // },
    // upload one image
    'post /api/v1/image': {
      controller    : 'image',
      action        : 'create',
      model         : 'image',
      responseType  : 'json',
      permission    : 'upload_image',
      upload: {
        dest: projectPath + '/files/uploads/images/original',
        /**
         * Rename file
         * @param  {string} fieldname
         * @param  {string} filename
         * @return {string}           uuid
         */
        rename: function () {
          return Date.now() + '_' + uuid.v1();
        },
        limits: {
          fieldNameSize: 150,
          files: 1,
          fileSize: 10*1000000, // 10MB
          fieldSize: 20*1000000 // 20MB
        },
        onFileUploadStart: function(file) {
          // check if file is valir on upload start
          if (imageMimeTypes.indexOf(file.mimetype) < 0) {
            console.log('Image:onFileUploadStart: Invalid file type for file:', file);
            // cancel upload on invalid type
            return false;
          }
        }
      }
    }
  });

  plugin.setTemplates({
    'components-file': __dirname + '/server/templates/components-file.hbs',
    'forms/file/image': __dirname + '/server/templates/forms/file/image.hbs'
  });

  plugin.setHelpers({
    'we-image': __dirname + '/server/helpers/we-image.js'
  });

  plugin.addJs('we.component.imageSelector', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-file',
    path: 'files/public/we.components.imageSelector.js'
  });

  plugin.hooks.on('we:create:default:folders', function(we, done) {
    // create image upload path
    mkdirp(we.config.upload.image.uploadPath, function(err) {
      if (err) we.log.error('Error on create upload path', err);
      done();
    })
  });

  // use before instance to set sequelize virtual fields for term fields
  plugin.hooks.on('we:models:before:instance', function (we, done) {
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
  plugin.hooks.on('we:models:set:joins', function (we, done) {
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

  plugin.events.on('we:after:load:plugins', function (we) {
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

      async.series(functions, done);
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

      db.models.modelsterms.destroy({
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
   * @param  {{String}} fieldName
   * @return {{Function}}
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
   * @param  {{String}} fieldName
   * @return {{Function}}
   */
  function getFieldGetter(fieldName) {
    return function getImages() {
      // return the value or a empty array
      return this.getDataValue(fieldName) || [];
    }
  }

  return plugin;
};