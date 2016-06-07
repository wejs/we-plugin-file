/**
 * File model
 *
 * @module      :: Model
 */

module.exports = function FileModel (we) {
  var _ = we.utils._
  var async = we.utils.async

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

      active: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true
      },

      originalname: { type: we.db.Sequelize.STRING },
      mime: { type: we.db.Sequelize.STRING(50) },
      extension: { type: we.db.Sequelize.STRING(10) },

      storageName: { type: we.db.Sequelize.STRING },
      isLocalStorage: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: true
      },

      urls: {
        type: we.db.Sequelize.BLOB,
        allowNull: false,
        skipSanitizer: true,
        get: function() {
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
        type: we.db.Sequelize.BLOB
      }
    },
    associations: {
      creator: { type: 'belongsTo', model: 'user' }
    },
    options: {
      // table comment
      comment: 'We.js file table'
    }
  }

   // after define all models add term field hooks in models how have terms
  we.hooks.on('we:models:set:joins', function (we, done) {
    var models = we.db.models
    for (var modelName in models) {
      var fileFields = we.file.file.getModelFileFields(
        we.db.modelsConfigs[modelName]
      )

      if (_.isEmpty(fileFields)) continue

      models[modelName].addHook('afterFind', 'loadFiles', we.file.file.afterFind)
      models[modelName].addHook('afterCreate', 'createFile', we.file.file.afterCreatedRecord)
      models[modelName].addHook('afterUpdate', 'updateFile', we.file.file.afterUpdatedRecord)
      models[modelName].addHook('afterDestroy', 'destroyFile', we.file.file.afterDeleteRecord)
    }

    done()
  })

  // use we:after:load:plugins for set file object and methods
  we.events.on('we:after:load:plugins', function (we) {
    if (!we.file) we.file = {}
    if (!we.file.file) we.file.file = {}
    var db = we.db

    we.file.file.getModelFileFields = function getModelFileFields (Model) {
      if (!Model || !Model.options || !Model.options.fileFields) return null
      return Model.options.fileFields
    }

    we.file.file.afterFind = function afterFind (r, opts, done) {
      var Model = this
      if (_.isArray(r)) {
        async.eachSeries(r, function (r1, next) {
          // we.db.models.fileassoc
          we.file.file.afterFindRecord.bind(Model)(r1, opts, next)
        }, done)
      } else {
        we.file.file.afterFindRecord.bind(Model)(r, opts, done)
      }
    }
    we.file.file.afterFindRecord = function afterFindRecord (r, opts, done) {
      var functions = []
      var Model = this
      // found 0 results
      if (!r) return done()
      // get fields
      var fields = we.file.file.getModelFileFields(this)
      if (!fields) return done()
      // set cache objects
      if (!r._salvedFiles) r._salvedFiles = {}
      if (!r._salvedFileAssocs) r._salvedFileAssocs = {}

      var fieldNames = Object.keys(fields)
      // for each file field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.fileassoc.findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            include: [{ all: true }]
          })
          .then(function (flAssocs) {
            if (_.isEmpty(flAssocs)) return next()

            r._salvedFiles = flAssocs.map(function (flAssoc) {
              return flAssoc.file.toJSON()
            })

            r.setDataValue(fieldName, r._salvedFiles)
            // salved terms cache
            r._salvedFileAssocs[fieldName] = flAssocs
            return next()
          })
          .catch(next)
        })
      })
      // run all file field find records in parallel
      async.parallel(functions, done)
    }
    // after create one record with file fields
    we.file.file.afterCreatedRecord = function afterCreatedRecord (r, opts, done) {
      var functions = []
      var Model = this

      var fields = we.file.file.getModelFileFields(this)
      if (!fields) return done()

      var fileFields = Object.keys(fields)

      if (!r._salvedFiles) r._salvedFiles = {}
      if (!r._salvedFileAssocs) r._salvedFileAssocs = {}

      fileFields.forEach(function (fieldName) {
        var values = r.get(fieldName)
        if (_.isEmpty(values)) return

        var filesToSave = []
        var newFileAssocs = []

        functions.push(function (nextField) {
          async.each(values, function (value, next) {
            if (!value || (value === 'null')) return next()

            // check if the file exists
            db.models.file.findOne({
              where: { id: value.id || value }
            }).then(function (i) {
              if (!i) return next()

              db.models.fileassoc.create({
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                fileId: value.id || value
              }).then(function (r) {
                we.log.verbose('File assoc created:', r.id)

                filesToSave.push(i)
                newFileAssocs.push(r)

                next()
              }).catch(next)
            }).catch(next)
          }, function (err) {
            if (err) return nextField(err)

            r._salvedFileAssocs[fieldName] = newFileAssocs
            r._salvedFiles[fieldName] = filesToSave
            r.setDataValue(fieldName, filesToSave.map(function (im) {
              return im.toJSON()
            }))

            nextField()
          })
        })
      })
      // TODO check if is better to run this in parallel
      async.series(functions, done)
    }
    // after update one record with file fields
    we.file.file.afterUpdatedRecord = function afterUpdatedRecord (r, opts, done) {
      var Model = this

      var fields = we.file.file.getModelFileFields(this)
      if (!fields) return done()

      var fieldNames = Object.keys(fields)
      async.eachSeries(fieldNames, function (fieldName, nextField) {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField()

        var filesToSave = _.clone(r.get(fieldName))
        var newFileAssocs = []
        var newFileAssocsIds = []

        async.series([
          function findOrCreateAllAssocs (done) {
            var preloadedFilesAssocsToSave = []

            async.each(filesToSave, function (its, next) {
              if (_.isEmpty(its) || its === 'null') return next()

              var values = {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                fileId: its.id || its
              }
              // check if this file exits
              db.models.file
              .findOne({
                where: { id: its.id || its }
              })
              .then(function (i) {
                if (!i) return done()
                // find of create the assoc
                return db.models.fileassoc
                .findOrCreate({
                  where: values, defaults: values
                })
                .then(function (r) {
                  r[0].file = i
                  preloadedFilesAssocsToSave.push(r[0])
                  next()
                })
              })
              .catch(done)
            }, function (err) {
              if (err) return done(err)

              filesToSave = preloadedFilesAssocsToSave.map(function (r) {
                newFileAssocsIds.push(r.id)
                return r.file
              })

              newFileAssocs = preloadedFilesAssocsToSave
              done()
            })
          },
          // delete removed file assocs
          function deleteAssocs (done) {
            var query = {
              where: {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName
              }
            }

            if (!_.isEmpty(newFileAssocsIds)) query.where.id = { $notIn: newFileAssocsIds }

            db.models.fileassoc
            .destroy(query)
            .then(function afterDelete (result) {
              we.log.verbose('Result from deleted file assocs: ', result, fieldName, Model.name)
              done()
            })
            .catch(done)
          },
          function setRecorValues (done) {
            r._salvedFiles[fieldName] = filesToSave
            r._salvedFileAssocs[fieldName] = newFileAssocs
            r.setDataValue(fieldName, filesToSave.map(function (im) {
              return im.toJSON()
            }))
            done()
          }
        ], nextField)
      }, done)
    }
    // delete the file associations after delete related model
    we.file.file.afterDeleteRecord = function afterDeleteRecord (r, opts, done) {
      var Model = this

      db.models.fileassoc
      .destroy({
        where: {
          modelName: Model.name,
          modelId: r.id
        }
      })
      .then(function (result) {
        we.log.debug('Deleted ' + result + ' file assocs from record with id: ' + r.id)
        return done()
      })
      .catch(done)
    }
  })

  return model
}
