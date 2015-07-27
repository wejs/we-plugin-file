/**
 * We.js we-pluginfile plugin settings
 */
var uuid = require('node-uuid');

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
      },
      'find_file': {
        'title': 'Find file',
        'description': 'Find and list files'
      },
      'upload_file': {
        'title': 'Upload file',
        'description': 'Upload and save files on server'
      },
      'delete_file': {
        'title': 'Delete file',
        'description': 'Delete one file file and data'
      }
    },
    upload: {
      file: {
        uploadPath: projectPath + '/files/uploads/files',
      },
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
        // TODO change to temp dir
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
          // check if file is valid on upload start
          if (imageMimeTypes.indexOf(file.mimetype) < 0) {
            console.log('Image:onFileUploadStart: Invalid file type for file:', file);
            // cancel upload on invalid type
            return false;
          }
        }
      }
    },
    'post /api/v1/file': {
      controller    : 'file',
      action        : 'create',
      model         : 'file',
      responseType  : 'json',
      permission    : 'upload_file',
      upload: {
        dest: projectPath + '/files/uploads/files',
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
        }
      }
    }
  });

  plugin.addJs('we.component.imageSelector', {
    type: 'plugin', weight: 20, pluginName: 'we-plugin-file',
    path: 'files/public/we.components.imageSelector.js'
  });

  return plugin;
};