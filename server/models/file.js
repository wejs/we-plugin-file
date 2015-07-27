/**
 * File model
 *
 * @module      :: Model
 */
var fs = require('fs');
var async = require('async');
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
      mime: { type: we.db.Sequelize.STRING },
      extension: { type: we.db.Sequelize.STRING }
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

  return model;
}