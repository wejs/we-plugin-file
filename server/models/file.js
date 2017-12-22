/**
 * File model
 *
 * @module      :: Model
 */

module.exports = function FileModel (we) {
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
        get() {
          let v = this.getDataValue('urls');
          if (!v) return {};

          if (v instanceof Buffer) {
            try {
              return JSON.parse(v.toString('utf8'));
            } catch (e) {
              we.log.error('error on parse file urls from db', e);
              return {};
            }
          } else if (typeof v == 'string') {
            return JSON.parse(v);
          } else {
            return v;
          }
        },
        set(v) {
          if (!v) v = {};
          if (typeof v != 'object') {
            throw new Error('file:urls:need_be_object');
          }

          this.setDataValue('urls', JSON.stringify(v));
        }
      },
      extraData: {
        type: we.db.Sequelize.BLOB,
        skipSanitizer: true,
        get() {
          let v = this.getDataValue('extraData');
          if (!v) return {};

          if (v instanceof Buffer) {
            try {
              return JSON.parse(v.toString('utf8'));
            } catch (e) {
              we.log.error('error on parse file extraData from db', e);
              return {};
            }
          } else if (typeof v == 'string') {
            return JSON.parse(v);
          } else {
            return v;
          }
        },
        set(v) {
          if (!v) v = {};
          if (typeof v != 'object') {
            throw new Error('file:extraData:need_be_object');
          }

          this.setDataValue('extraData', JSON.stringify(v));
        }
      }
    },
    associations: {
      creator: {
        type: 'belongsTo',
        model: 'user'
      }
    }
  }

   // after define all models add term field hooks in models how have terms
  we.hooks.on('we:models:set:joins', function (we, done) {
    const models = we.db.models
    for (let modelName in models) {
      let fileFields = we.file.file.getModelFileFields(
        we.db.modelsConfigs[modelName]
      );

      if (_.isEmpty(fileFields)) continue;

      const m = models[modelName];

      m.addHook('afterFind', 'loadFiles', we.file.file.afterFind);
      m.addHook('afterCreate', 'createFile', we.file.file.afterCreatedRecord);
      m.addHook('afterUpdate', 'updateFile', we.file.file.afterUpdatedRecord);
      m.addHook('afterDestroy', 'destroyFile', we.file.file.afterDeleteRecord);
    }

    done();
  })

  // use we:after:load:plugins for set file object and methods
  we.events.on('we:after:load:plugins', function (we) {
    if (!we.file) we.file = {};
    if (!we.file.file) we.file.file = {};
    const db = we.db;

    we.file.file.getModelFileFields = function getModelFileFields (Model) {
      if (!Model || !Model.options || !Model.options.fileFields) return null;
      return Model.options.fileFields;
    }

    we.file.file.afterFind = function afterFind (r, opts, done) {
      const Model = this;
      if (_.isArray(r)) {
        async.eachSeries(r, (r1, next)=> {
          // we.db.models.fileassoc
          we.file.file.afterFindRecord.bind(Model)(r1, opts, next);
        }, done);
      } else {
        we.file.file.afterFindRecord.bind(Model)(r, opts, done);
      }
    }
    we.file.file.afterFindRecord = function afterFindRecord (r, opts, done) {
      const functions = [];
      const Model = this;
      // found 0 results
      if (!r) return done();
      // get fields
      let fields = we.file.file.getModelFileFields(this);
      if (!fields) return done();
      // set cache objects
      if (!r._salvedFiles) r._salvedFiles = {};
      if (!r._salvedFileAssocs) r._salvedFileAssocs = {};

      let fieldNames = Object.keys(fields);
      // for each file field
      fieldNames.forEach( (fieldName)=> {
        functions.push( (next)=> {
          return db.models.fileassoc
          .findAll({
            where: {
              modelName: Model.name,
              modelId: r.id,
              field: fieldName
            },
            include: [{ all: true }]
          })
          .then( (flAssocs)=> {
            if (_.isEmpty(flAssocs)) {
              next();
              return null;
            }

            r._salvedFiles = flAssocs.map( (flAssoc)=> {
              return flAssoc.file.toJSON();
            });

            r.setDataValue(fieldName, r._salvedFiles);
            // salved terms cache
            r._salvedFileAssocs[fieldName] = flAssocs;
            next();
            return null;
          })
          .catch(next);
        });
      })
      // run all file field find records in parallel
      async.parallel(functions, done);
    }
    // after create one record with file fields
    we.file.file.afterCreatedRecord = function afterCreatedRecord (r, opts, done) {
      const functions = [];
      const Model = this;

      let fields = we.file.file.getModelFileFields(this);
      if (!fields) return done();

      let fileFields = Object.keys(fields);

      if (!r._salvedFiles) r._salvedFiles = {};
      if (!r._salvedFileAssocs) r._salvedFileAssocs = {};

      fileFields.forEach( (fieldName)=> {
        let values = r.get(fieldName);
        if (_.isEmpty(values)) return;

        let filesToSave = [];
        let newFileAssocs = [];

        functions.push( (nextField)=> {
          async.each(values, (value, next)=> {
            if (!value || (value === 'null')) return next();

            // check if the file exists
            db.models.file.findOne({
              where: { id: value.id || value }
            })
            .then( (i)=> {
              if (!i) {
                next();
                return null;
              }

              db.models.fileassoc
              .create({
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                fileId: value.id || value
              })
              .then( (r)=> {
                we.log.verbose('File assoc created:', r.id);

                filesToSave.push(i);
                newFileAssocs.push(r);

                next();
                return null;
              })
              .catch(next);
            })
            .catch(next);
          }, (err)=> {
            if (err) return nextField(err);

            r._salvedFileAssocs[fieldName] = newFileAssocs;
            r._salvedFiles[fieldName] = filesToSave;
            r.setDataValue(fieldName, filesToSave.map( (im)=> {
              return im.toJSON();
            }));

            nextField();
          })
        })
      })
      // TODO check if is better to run this in parallel
      async.series(functions, done);
    }
    // after update one record with file fields
    we.file.file.afterUpdatedRecord = function afterUpdatedRecord (r, opts, done) {
      const Model = this;

      const fields = we.file.file.getModelFileFields(this);
      if (!fields) return done();

      let fieldNames = Object.keys(fields);
      async.eachSeries(fieldNames, (fieldName, nextField)=> {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField()

        let filesToSave = _.clone(r.get(fieldName));
        let newFileAssocs = [];
        let newFileAssocsIds = [];

        async.series([
          function findOrCreateAllAssocs (done) {
            let preloadedFilesAssocsToSave = [];

            async.each(filesToSave, (its, next)=> {
              if (_.isEmpty(its) || its === 'null') return next();

              let values = {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName,
                fileId: its.id || its
              };
              // check if this file exits
              db.models.file
              .findOne({
                where: { id: its.id || its }
              })
              .then( (i)=> {
                if (!i) {
                  done();
                  return null;
                }
                // find of create the assoc
                return db.models.fileassoc
                .findOrCreate({
                  where: values,
                  defaults: values
                })
                .then( (r)=> {
                  r[0].file = i;
                  preloadedFilesAssocsToSave.push(r[0]);
                  next();
                  return null;
                });
              })
              .catch(done);
            }, (err)=> {
              if (err) return done(err);

              filesToSave = preloadedFilesAssocsToSave.map( (r)=> {
                newFileAssocsIds.push(r.id);
                return r.file;
              });

              newFileAssocs = preloadedFilesAssocsToSave;
              done();
            });
          },
          // delete removed file assocs
          function deleteAssocs (done) {
            let query = {
              where: {
                modelName: Model.name,
                modelId: r.id,
                field: fieldName
              }
            };

            if (!_.isEmpty(newFileAssocsIds)) {
              query.where.id = { $notIn: newFileAssocsIds };
            }

            db.models.fileassoc
            .destroy(query)
            .then(function afterDelete (result) {
              we.log.verbose('Result from deleted file assocs: ', result, fieldName, Model.name);
              done();
              return null;
            })
            .catch(done);
          },
          function setRecorValues (done) {
            r._salvedFiles[fieldName] = filesToSave;
            r._salvedFileAssocs[fieldName] = newFileAssocs;
            r.setDataValue(fieldName, filesToSave.map( (im)=> {
              return im.toJSON();
            }));
            done();
          }
        ], nextField);
      }, done);
    }
    // delete the file associations after delete related model
    we.file.file.afterDeleteRecord = function afterDeleteRecord (r, opts, done) {
      const Model = this;

      db.models.fileassoc
      .destroy({
        where: {
          modelName: Model.name,
          modelId: r.id
        }
      })
      .then( (result)=> {
        we.log.debug('Deleted ' + result + ' file assocs from record with id: ' + r.id);
        done();
        return null;
      })
      .catch(done);
    }
  });

  return model;
}
