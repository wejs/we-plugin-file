/**
 * We.js we-pluginfile plugin settings
 */
var multer = require('multer')
var uuid = require('node-uuid')
var mkdirp = require('mkdirp')

module.exports = function loadPlugin (projectPath, Plugin) {
  var plugin = new Plugin(__dirname)

  plugin.defaultFilename = function defaultFilename (req, file, cb) {
    file.name = Date.now() + '_' + uuid.v1() + '.' + file.originalname.split('.').pop()
    cb(null, file.name)
  }

  var imageMimeTypes = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/bmp',
    'image/x-icon',
    'image/tiff'
  ]

  // set plugin configs
  plugin.setConfigs({
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
      },
      'find_user_image': {
        'title': 'Find user images',
        'description': ' '
      },

      'find_all_system_images': {
        'title': 'Find all system images',
        'description': ' '
      }
    },
    upload: {
      file: {
        uploadPath: projectPath + '/files/uploads/files'
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
  })
  // ser plugin routes
  plugin.setRoutes({
    // get logged in user avatar
    'get /avatar/:id([0-9]+)': {
      controller: 'avatar',
      action: 'getAvatar',
      permission: 'find_user'
    },
    'post /api/v1/user/:id([0-9]+)/avatar': {
      controller: 'avatar',
      action: 'changeAvatar',
      model: 'user',
      loadRecord: true,
      permission: 'update_user'
    },
    //
    // --  Images routes
    //
    'get /api/v1/image': {
      controller: 'image',
      action: 'find',
      model: 'image',
      responseType: 'json',
      permission: 'find_image'
    },
    'get /api/v1/image/:name': {
      controller: 'image',
      action: 'findOne',
      model: 'image',
      responseType: 'json',
      permission: 'find_image'
    },
    // Image style thumbnail | medium | large
    'get /api/v1/image/:style(original|mini|thumbnail|medium|large)/:name': {
      controller: 'image',
      action: 'findOne',
      model: 'image',
      responseType: 'json',
      permission: 'find_image'
    },
    'get /api/v1/image/:id([0-9]+)/data': {
      controller: 'image',
      action: 'findOneReturnData',
      model: 'image',
      responseType: 'json',
      loadRecord: true,
      permission: 'find_image'
    },
    // 'post /api/v1/image-crop/:id([0-9]+)': {
    //   controller: 'image',
    //   action: 'cropImage',
    //   model: 'image',
    //   responseType: 'json',
    //   loadRecord: true,
    //   permission: 'crop_image'
    // },
    // 'delete /api/v1/image/:id([0-9]+)': {
    //   controller    : 'image',
    //   action        : 'delete',
    //   model         : 'image',
    //   responseType  : 'json',
    //   permission    : 'delete_image'
    // },
    // upload one image
    'post /api/v1/image': {
      controller: 'image',
      action: 'create',
      model: 'image',
      responseType: 'json',
      permission: 'upload_image',
      upload: {
        storage: multer.diskStorage({
          destination: projectPath + '/files/uploads/images/original',
          filename: plugin.defaultFilename
        }),
        // limmit settings used in multer({ limits: '' })
        limits: {
          fieldNameSize: 150,
          fileSize: 10 * 1000000, // 10MB
          fieldSize: 20 * 1000000 // 20MB
        },
        // file filter function used in multer({ fileFilter: fn })
        fileFilter: function fileFilter (req, file, cb) {
          // The function should call `cb` with a boolean
          // to indicate if the file should be accepted
          if (imageMimeTypes.indexOf(file.mimetype) < 0) {
            req.we.log.warn('Image:onFileUploadStart: Invalid file type for file:', file)
            // cancel upload on invalid type
            return cb(null, false)
          }

          // To accept the file pass `true`, like so:
          cb(null, true)
        },

        // only accept one imagem in image param
        fields: [{
          name: 'image', maxCount: 1
        }]
      }
    },
    'get /api/v1/file/:id([0-9]+)': {
      controller: 'file',
      action: 'findOne',
      model: 'file',
      responseType: 'json',
      permission: 'find_file'
    },
    'get /api/v1/file-download/:name': {
      controller: 'file',
      action: 'download',
      model: 'file',
      responseType: 'json',
      permission: 'find_file'
    },
    'post /api/v1/file': {
      controller: 'file',
      action: 'create',
      model: 'file',
      responseType: 'json',
      permission: 'upload_file',
      upload: {
        storage: multer.diskStorage({
          destination: projectPath + '/files/uploads/files',
          filename: plugin.defaultFilename
        }),

        limits: {
          fieldNameSize: 150,
          files: 1,
          fileSize: 10 * 1000000, // 10MB
          fieldSize: 20 * 1000000 // 20MB
        },
        // only accept one file in file param
        fields: [{
          name: 'file', maxCount: 1
        }]
      }
    },
    // user image routes
    'get /user/:userId/image': {
      controller: 'image',
      action: 'find',
      model: 'image',
      permission: 'find_user_image',
      search: {
        currentUserIs: {
          parser: 'paramIs',
          param: 'userId',
          runIfNull: true,
          target: {
            type: 'field',
            field: 'creatorId'
          }
        }
      }
    },

    'get /api/v1/:type(file|image)/get-form-modal-content': {
      controller: 'file',
      action: 'getFormModalContent',
      model: 'file',
      responseType: 'modal',
      permission: true
    }
  })

  //
  // - Plugin functions
  //
  plugin.uploader = function getUploader (uploadConfigs) {
    return multer(uploadConfigs).fields(uploadConfigs.fields)
  }

  plugin.setUploadMiddleware = function setUploadMiddleware (data) {
    // data = {we: app, middlewares: middlewares, config: config
    var config = data.config
    var middlewares = data.middlewares
    // bind upload  if have upload config and after ACL check
    if (config.upload) {
      middlewares.push(plugin.uploader(config.upload))
    }
  }

  plugin.createFileFolder = function createFileFolder (we, done) {
    // create file upload path
    mkdirp(we.config.upload.file.uploadPath, function (err) {
      if (err) we.log.error('Error on create file upload path', err)
    })

    done()
  }

  //
  // -- Events
  //
  plugin.events.on('router:before:set:controller:middleware', plugin.setUploadMiddleware)
  plugin.hooks.on('we:create:default:folders', plugin.createFileFolder)

  //
  // - Plugin assets
  //

  plugin.addJs('we.component.imageSelector', {
    weight: 20, pluginName: 'we-plugin-file',
    path: 'files/public/we.components.imageSelector.js'
  })

  plugin.addJs('we.component.fileSelector', {
    weight: 20, pluginName: 'we-plugin-file',
    path: 'files/public/we.components.fileSelector.js'
  })

  plugin.addJs('jquery.fancybox', {
    weight: 15, pluginName: 'we-plugin-file',
    path: 'files/public/fancyBox/source/jquery.fancybox.pack.js'
  })

  plugin.addCss('jquery.fancybox', {
    weight: 15, pluginName: 'we-plugin-file',
    path: 'files/public/fancyBox/source/jquery.fancybox.css'
  })

  // - jquery.fileupload
  //
  plugin.addJs('jquery.iframe-transport', {
    weight: 7, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.iframe-transport.js'
  })

  plugin.addJs('jquery.fileupload', {
    weight: 7, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload.js'
  })

  plugin.addCss('jquery.fileupload', {
    weight: 7, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/css/jquery.fileupload.css'
  })

  plugin.addJs('jquery.fileupload-process', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-process.js'
  })

  plugin.addJs('jquery.fileupload-image', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-image.js'
  })

  plugin.addJs('jquery.fileupload-audio', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-audio.js'
  })

  plugin.addJs('jquery.fileupload-video', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-video.js'
  })

  plugin.addJs('jquery.fileupload-validate', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-validate.js'
  })

  plugin.addJs('jquery.fileupload-ui', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-ui.js'
  })

  plugin.addJs('jquery.fileupload-jquery-ui', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/js/jquery.fileupload-jquery-ui.js'
  })

  plugin.addCss('jquery.fileupload-jquery-ui', {
    weight: 8, pluginName: 'we-plugin-file',
    path: 'files/public/jquery.fileupload/css/jquery.fileupload-ui.css'
  })

  return plugin
}
