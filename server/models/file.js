/**
 * File model
 *
 * @module      :: Model
 */
var mkdirp = require('mkdirp');

module.exports = function FileModel(we) {
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
      mime: { type: we.db.Sequelize.STRING(50) },
      extension: { type: we.db.Sequelize.STRING(10) }
    },
    associations: {
      creator: { type: 'belongsTo', model: 'user' }
    },
    options: {
      // table comment
      comment: 'We.js file table',

      classMethods: {
        getStyleUrlFromFile: function(r) {
          return {
            original: we.config.hostname + '/api/v1/file/original/' + r.name
          };
        },

        getFilePath: function getFilePath(fileName) {
          return we.config.upload.file.uploadPath + '/original/' + fileName;
        }
      },

      instanceMethods: {
        toJSON: function() {
          var obj = this.get();
          obj.urls = we.db.models.image.getStyleUrlFromFile(obj);
          return obj;
        }
      },
      hooks: {
        beforeCreate: function(record, options, next) {
          // sanitize
          record = we.sanitizer.sanitizeAllAttr(record);
          next();
        },
        beforeUpdate: function(record, options, next) {
          // sanitize
          record = we.sanitizer.sanitizeAllAttr(record);
          next();
        }
      }
    }
  }

  we.hooks.on('we:create:default:folders', function (we, done) {
    // create file upload path
    mkdirp(we.config.upload.file.uploadPath, function (err) {
      if (err) we.log.error('Error on create image upload path', err);
    })

    done();
  });

  return model;
}