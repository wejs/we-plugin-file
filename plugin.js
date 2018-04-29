/**
 * We.js we-pluginfile plugin settings
 */
const multer = require('multer'),
  path = require('path');

const imageMimeTypes = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/x-icon',
  'image/tiff',
  'image/vnd.microsoft.icon' // .ico
];

module.exports = function loadPlugin (pp, Plugin) {
  const plugin = new Plugin(__dirname);
  const lConfig = plugin.we.config;

  let styles;
  plugin.multer = multer;

  if (lConfig.upload && lConfig.upload.image && lConfig.upload.image.avaibleStyles) {
    styles = lConfig.upload.image.avaibleStyles;
  } else {
    styles = [ 'thumbnail', 'medium', 'large' ];
  }

  // set plugin configs
  plugin.setConfigs({
    defaultUserAvatar: path.resolve(__dirname, 'files/public/avatar.png'),
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
      // defaultImageStorage: null,
      // defaultFileStorage: null,

      file: {},
      image: {
        avaibleStyles: styles,
        styles: {
          thumbnail: { width: '75', heigth: '75' },
          medium: { width: '250', heigth: '250' },
          large: { width: '640', heigth: '640' }
        }
      }
    }
  })

  const pPoutes = {
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
    // upload one image
    'post /api/v1/image': {
      controller: 'image',
      action: 'create',
      model: 'image',
      responseType: 'json',
      permission: 'upload_image',
      upload: {
        isImage: true,

        // limmit settings used in multer({ limits: '' })
        limits: {
          fieldNameSize: 150,
          fileSize: 10 * 1000000, // 10MB
          fieldSize: 20 * 1000000 // 20MB
        },
        // file filter function used in multer({ fileFilter: fn })
        fileFilter(req, file, cb) {
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
    'delete /api/v1/image/:name': {
      controller: 'image',
      action: 'destroy',
      model: 'image',
      responseType: 'json',
      permission: 'delete_image'
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
        isLocalStorage: true,

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
    },
    'delete /api/v1/file/:name': {
      controller: 'file',
      action: 'destroy',
      model: 'file',
      responseType: 'json',
      permission: 'delete_file'
    }
  };

    // Image style thumbnail | medium | large
  pPoutes['get /api/v1/image/:style('+styles.concat('original').join('|')+')/:name'] = {
    controller: 'image',
    action: 'findOne',
    model: 'image',
    responseType: 'json',
    permission: 'find_image'
  };

  pPoutes['get /api/v1/image/:id([0-9]+)/data'] = {
    controller: 'image',
    action: 'findOneReturnData',
    model: 'image',
    responseType: 'json',
    loadRecord: true,
    permission: 'find_image'
  };

  // ser plugin routes
  plugin.setRoutes(pPoutes);

  /**
   * Plugin fast loader for speed up we.js projeto bootstrap
   *
   * @param  {Object}   we
   * @param {Function} done    callback
   */
  plugin.fastLoader = function fastLoader(we, done) {
    // - Controllers:
    we.controllers.avatar = new we.class.Controller(require('./server/controllers/avatar.js'));
    we.controllers.file = new we.class.Controller(require('./server/controllers/file.js'));
    we.controllers.image = new we.class.Controller(require('./server/controllers/image.js'));

    // - Models
    we.db.modelsConfigs.file = require('./server/models/file.js')(we);
    we.db.modelsConfigs.fileassoc = require('./server/models/fileassoc.js')(we);
    we.db.modelsConfigs.image = require('./server/models/image.js')(we);
    we.db.modelsConfigs.imageassoc = require('./server/models/imageassoc.js')(we);

    done();
  }

  //
  // - Plugin functions
  //

  /**
   * Get plugin uploader middleware
   *
   * @param  {Object} uploadConfigs options
   * @return {Function}               Express middleware
   */
  plugin.uploader = function getUploader (uploadConfigs) {
    return multer(uploadConfigs).fields(uploadConfigs.fields)
  }

  /**
   * Build and set upload middleware
   *
   * @param {Object} data {we: app, middlewares: middlewares, config: config}
   */
  plugin.setUploadMiddleware = function setUploadMiddleware (data) {
    const we = data.we
    let config = data.config
    let middlewares = data.middlewares

    // bind upload  if have upload config and after ACL check
    if (config.upload) {
      let storageName = config.upload.storageName

      if (!storageName) {
        if (config.upload.isImage) {
          storageName = we.config.upload.defaultImageStorage;
        } else if(config.upload.isVideo) {
          storageName = we.config.upload.defaultVideoStorage
        } else if(config.upload.isAudio) {
          storageName = we.config.upload.defaultAudioStorage
        } else {
          storageName = we.config.upload.defaultFileStorage
        }
      }

      if (!config.upload.storage && storageName) {
        let storageStrategy = we.config.upload.storages[storageName]

        if (
          !storageStrategy ||
          !storageStrategy.getStorage
        ) {
          we.log.warn('we-plugin-file:storage not found in we.config.upload.storages: ' + storageName)
          return;
        }

        // storage.getUrlFromFile is required
        if (!storageStrategy.getUrlFromFile) {
          we.log.warn('we-plugin-file:we.config.upload.storages["' +
            storageName +
          '"].getUrlFromFile is required')
          return;
        }

        config.upload.storage = storageStrategy.getStorage(we)
        config.storageStrategy = storageStrategy
      }

      middlewares.push(plugin.uploader(config.upload))
    }
  }

  /**
   * Get sequelize file field getter function
   *
   * @param  {String} fieldName
   * @return {Function}
   */
  plugin.getFieldSetter = function getFieldSetter (fieldName) {
    return function setFiles (val) {
      if (plugin.we.utils._.isArray(val)) {
        let newVal = []
        // skip flags and invalid values
        for (let i = 0; i < val.length; i++) {
          if (val[i] && val[i] !== 'null') newVal.push(val[i])
        }
        this.setDataValue(fieldName, newVal)
      } else if (val && val !== 'null') {
        this.setDataValue(fieldName, [val])
      } else {
        this.setDataValue(fieldName, null)
      }
    }
  }

  /**
   * Get sequelize file field setter function
   *
   * @param  {String} fieldName
   * @return {Function}
   */
  plugin.getFieldGetter = function getFieldGetter (fieldName) {
    return function getFiles () {
      // return the value or a empty array
      return this.getDataValue(fieldName) || []
    }
  }

  /**
   * Set one model file or image field
   *
   * @param {Object} model  we.db.models.[model]
   * @param {String} name   field name
   * @param {Object} opts   file field options
   * @param {Object} we     we.js object
   * @param {String} ffield form field type
   */
  plugin.setModelFileField = function setModelFileField (model, name, opts, we, ffield) {
    if (model.definition[name]) {
      we.log.verbose('Field already defined for file field:', name)
      return
    }

    // set field configs
    let cfgs = we.utils._.clone(opts)
    cfgs.type = we.db.Sequelize.VIRTUAL
    // set virtual setter
    cfgs.set = plugin.getFieldSetter(name, cfgs)
    // set virtual getter
    cfgs.get = plugin.getFieldGetter(name, cfgs)
    // set form field html
    cfgs.formFieldType = ffield
    //'file/file'
    // set virtual fields for term fields if not exists
    model.definition[name] = cfgs
  }

  plugin.setModelsFileField = function setModelsFileField (we, done) {
    let f, models = we.db.modelsConfigs

    for (var modelName in models) {
      if (models[modelName].options) {
        if (models[modelName].options.fileFields) {
          // file fields
          for (f in models[modelName].options.fileFields) {
            plugin.setModelFileField (
              models[modelName],
              f,
              models[modelName].options.fileFields[f],
              we,
              'file/file'
            )
          }
        }

        if (models[modelName].options.imageFields) {
          for (f in models[modelName].options.imageFields) {
            plugin.setModelFileField (
              models[modelName],
              f,
              models[modelName].options.imageFields[f],
              we,
              'file/image'
            )
          }
        }

        if (models[modelName].options.videoFields) {
          for (f in models[modelName].options.videoFields) {
            plugin.setModelFileField (
              models[modelName],
              f,
              models[modelName].options.videoFields[f],
              we,
              'file/video'
            )
          }
        }

        if (models[modelName].options.audioFields) {
          for (f in models[modelName].options.audioFields) {
            plugin.setModelFileField (
              models[modelName],
              f,
              models[modelName].options.audioFields[f],
              we,
              'file/audio'
            )
          }
        }
      }
    }
    done()
  }

  //
  // -- Events
  //

  plugin.events.on('we:after:load:express', function (we) {
    // your code here ...
    if (!we.config.upload.defaultImageStorage) {
      we.log.warn('we-plugin-file: install a file storage plugin and configure the '+
        'we.config.upload.defaultImageStorage with you storageStrategy')
      return;
    }

    if (!we.config.upload.defaultFileStorage) {
      we.log.warn('we-plugin-file: install a file storage plugin and configure the '+
        'we.config.upload.defaultFileStorage with storageStrategy')
      return;
    }
  });

  plugin.events.on('router:before:set:controller:middleware', plugin.setUploadMiddleware)
  plugin.hooks.on('we:models:before:instance', plugin.setModelsFileField)

  //
  // - Plugin assets
  // - Only works if we-plugin-view is installed
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

  return plugin;
}
