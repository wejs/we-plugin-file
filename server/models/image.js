/**
 * Image model
 *
 * @module      :: Model
 *
 */

module.exports = function ImageModel (we) {
  const _ = we.utils._,
    async = we.utils.async;

  // set sequelize model define and options
  const model = {
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

      active: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true
      },

      originalname: { type: we.db.Sequelize.STRING },
      mime: { type: we.db.Sequelize.STRING },
      extension: { type: we.db.Sequelize.STRING },

      storageName: { type: we.db.Sequelize.STRING },
      isLocalStorage: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true
      },

      urls: {
        type: we.db.Sequelize.BLOB,
        allowNull: false,
        skipSanitizer: true,
        get() {
          var v = this.getDataValue('urls')
          if (!v) return {}

          if (v instanceof Buffer) {
            try {
              return JSON.parse(v.toString('utf8'))
            } catch (e) {
              we.log.error('error on parse file urls from db', e)
              return {}
            }
          } else if (typeof v == 'string') {
            return JSON.parse(v)
          } else {
            return v
          }
        },
        set: function(v) {
          if (!v) v = {}
          if (typeof v != 'object')
            throw new Error('file:urls:need_be_object')

          this.setDataValue('urls', JSON.stringify(v))
        }
      },

      extraData: {
        type: we.db.Sequelize.BLOB,
        skipSanitizer: true,
        get: function() {
          var v = this.getDataValue('extraData')
          if (!v) return {}

          if (v instanceof Buffer) {
            try {
              return JSON.parse(v.toString('utf8'))
            } catch (e) {
              we.log.error('error on parse file extraData from db', e)
              return {}
            }
          } else if (typeof v == 'string') {
            return JSON.parse(v)
          } else {
            return v
          }
        },
        set: function(v) {
          if (!v) v = {}
          if (typeof v != 'object')
            throw new Error('file:extraData:need_be_object')

          this.setDataValue('extraData', JSON.stringify(v))
        }
      }
    },
    associations: {
      creator: { type: 'belongsTo', model: 'user' }
    }
  }

   // after define all models add image field hooks in models how have images
  we.hooks.on('we:models:set:joins', function (we, done) {
    var models = we.db.models
    for (var modelName in models) {
      var imageFields = we.file.image.getModelImageFields(
        we.db.modelsConfigs[modelName]
      )

      if (_.isEmpty(imageFields)) continue

      models[modelName].addHook('afterFind', 'loadImages', we.file.image.afterFind)
      models[modelName].addHook('afterCreate', 'createImage', we.file.image.afterCreatedRecord)
      models[modelName].addHook('afterUpdate', 'updateImage', we.file.image.afterUpdatedRecord)
      models[modelName].addHook('afterDestroy', 'destroyImage', we.file.image.afterDeleteRecord)
    }

    done()
  })

  we.events.on('we:after:load:plugins', function (we) {
    if (!we.file) we.file = {}
    if (!we.file.image) we.file.image = {}
    var db = we.db

    we.file.image.getModelImageFields = function getModelImageFields(Model) {
      if (!Model || !Model.options || !Model.options.imageFields) return null;
      return Model.options.imageFields
    }

    we.file.image.afterFind = function afterFind (r, opts, done) {
      var Model = this
      if (_.isArray(r)) {
        async.each(r, function (r1, next) {
          // we.db.models.imageassoc
          we.file.image.afterFindRecord.bind(Model)(r1, opts, next)
        }, done)
      } else {
        we.file.image.afterFindRecord.bind(Model)(r, opts, done)
      }
    }
    we.file.image.afterFindRecord = function afterFindRecord (r, opts, done) {
      var functions = []
      var Model = this
      // found 0 results
      if (!r) return done()

      var fields = we.file.image.getModelImageFields(this)
      if (!fields) return done()

      if (!r._salvedImages) r._salvedImages = {}
      if (!r._salvedImageAssocs) r._salvedImageAssocs = {}

      var fieldNames = Object.keys(fields)
      // for each field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.imageassoc.findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            include: [{ all: true }]
          })
          .then(function (imgAssocs) {
            if (_.isEmpty(imgAssocs)) return next()

            r._salvedImages = imgAssocs.map(function (imgAssoc) {
              return imgAssoc.image.toJSON()
            })

            r.setDataValue(fieldName, r._salvedImages)
            // salved terms cache
            r._salvedImageAssocs[fieldName] = imgAssocs
            return next()
          })
          .catch(next)
        })
      })

      async.parallel(functions, done)
    }
    // after create one record with image fields
    we.file.image.afterCreatedRecord = function afterCreatedRecord (r, opts, done) {
      var functions = []
      var Model = this

      var fields = we.file.image.getModelImageFields(this)
      if (!fields) return done()

      var imageFields = Object.keys(fields)

      if (!r._salvedImages) r._salvedImages = {}
      if (!r._salvedImageAssocs) r._salvedImageAssocs = {}

      imageFields.forEach(function (fieldName) {
        var values = r.get(fieldName)
        if (_.isEmpty(values)) return

        var imagesToSave = []
        var newImageAssocs = []

        functions.push(function (nextField) {
          async.each(values, function (value, next) {
            if (!value || (value === 'null')) return next()

            // check if the image exists
            db.models.image.findOne({
              where: { id: value.id || value }
            })
            .then(function (i) {
              if (!i) return next()

              return db.models.imageassoc.create({
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                imageId: value.id || value
              })
              .then(function (r) {
                we.log.verbose('Image assoc created:', r.id)

                imagesToSave.push(i)
                newImageAssocs.push(r)

                next()
              })
            })
            .catch(next)
          }, function (err) {
            if (err) return nextField(err)

            r._salvedImageAssocs[fieldName] = newImageAssocs
            r._salvedImages[fieldName] = imagesToSave
            r.setDataValue(fieldName, imagesToSave.map(function (im) {
              return im.toJSON()
            }))

            nextField()
          })
        })
      })

      async.series(functions, done)
    }
    // after update one record with image fields
    we.file.image.afterUpdatedRecord = function afterUpdatedRecord (r, opts, done) {
      var Model = this

      var fields = we.file.image.getModelImageFields(this)
      if (!fields) return done()

      var fieldNames = Object.keys(fields)
      async.eachSeries(fieldNames, function (fieldName, nextField) {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField()

        var imagesToSave = _.clone(r.get(fieldName))
        var newImageAssocs = []
        var newImageAssocsIds = []

        async.series([
          function findOrCreateAllAssocs (done) {
            var preloadedImagesAssocsToSave = []

            async.each(imagesToSave, function (its, next) {
              if (_.isEmpty(its) || its === 'null') return next()

              var values = {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                imageId: its.id || its
              }
              // check if this image exits
              db.models.image.findOne({
                where: { id: its.id || its }
              })
              .then(function (i) {
                if (!i) return done()
                // find of create the assoc
                return db.models.imageassoc.findOrCreate({
                  where: values, defaults: values
                })
                .then(function (r) {
                  r[0].image = i
                  preloadedImagesAssocsToSave.push(r[0])
                  next()
                })
              })
              .catch(done)
            }, function (err) {
              if (err) return done(err)

              imagesToSave = preloadedImagesAssocsToSave.map(function (r) {
                newImageAssocsIds.push(r.id)
                return r.image
              })

              newImageAssocs = preloadedImagesAssocsToSave
              done()
            })
          },
          // delete removed image assocs
          function deleteAssocs (done) {
            var query = { where: {
              modelName: Model.name, modelId: r.id, field: fieldName
            }}

            if (!_.isEmpty(newImageAssocsIds)) query.where.id = { $notIn: newImageAssocsIds }

            db.models.imageassoc
            .destroy(query)
            .then(function (result) {
              we.log.verbose('Result from deleted image assocs: ', result, fieldName, Model.name)
              done()
            })
            .catch(done)
          },
          function setRecorValues (done) {
            r._salvedImages[fieldName] = imagesToSave
            r._salvedImageAssocs[fieldName] = newImageAssocs
            r.setDataValue(fieldName, imagesToSave.map(function (im) {
              return im.toJSON()
            }))
            done()
          }
        ], nextField)
      }, done)
    }
    // delete the image associations after delete related model
    we.file.image.afterDeleteRecord = function afterDeleteRecord (r, opts, done) {
      var Model = this

      db.models.imageassoc
      .destroy({
        where: { modelName: Model.name, modelId: r.id }
      })
      .then(function (result) {
        we.log.debug('Deleted ' + result + ' image assocs from record with id: ' + r.id)
        return done()
      })
      .catch(done)
    }
  })

  return model
}
