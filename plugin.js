/**
 * We.js we-pluginfile plugin settings
 */
var uuid = require('node-uuid');
var mkdirp = require('mkdirp');

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
    upload: {
      image: {
        uploadPath: projectPath + '/files/uploads/images',
        avaibleStyles: [
          'mini',
          'thumbnail',
          'medium',
          'large'
        ],

        styles: {
          mini: {
            width: '24',
            heigth: '24'
          },
          thumbnail: {
            width: '75',
            heigth: '75'
          },
          medium: {
            width: '250',
            heigth: '250'
          },
          large: {
            width: '640',
            heigth: '640'
          }
        }
      }
    }
  });

  // ser plugin routes
  plugin.setRoutes({
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
            log.debug('Image:onFileUploadStart: Invalid file type for file:', file);
            // cancel upload on invalid type
            return false;
          }
        }
      }
    }
  });

  plugin.hooks.on('we:create:default:folders', function(we, done) {
    // create image upload path
    mkdirp(we.config.upload.image.uploadPath, function(err) {
      if (err) we.log.error('Error on create upload path', err);
      done();
    })
  });

  return plugin;
};