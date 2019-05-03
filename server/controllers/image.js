module.exports = {
  /**
   * Find images with support to see only own files
   *
   * @apiName image.find
   * @apiGroup image
   *
   * @apiParam {String} `selector` If set to owner will only return authenticated user images
   *
   * @module Controller
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Function} next Express.js callback
   *
   * @successResponse 200
   */
  find(req, res) {
    if (req.query.selector === 'owner' && req.isAuthenticated())  {
      // see only own images
      res.locals.query.where.creatorId = req.user.id;
    } else if (req.we.acl && req.we.acl.canStatic('find_all_system_images', req.userRoleNames)) {
      // can see all images
    } else {
      return res.forbidden();
    }

    return res.locals.Model
    .findAndCountAll(res.locals.query)
    .then( (record)=> {
      res.locals.metadata.count = record.count;
      res.locals.data = record.rows;
      res.ok();

      return null;
    })
    .catch(res.queryError);
  },

  /**
   * Find one image and returns its content or redirect to external url in external storages
   *
   * @apiName image.findOne
   * @apiGroup image
   *
   * @module Controller
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Function} next Express.js callback
   *
   * @successResponse 200
   */
  findOne(req, res) {
    const we = req.we;

    if (res.locals.data && res.locals.id) {
      return res.ok();
    }

    let fileName = req.params.name;

    if (!fileName) {
      return res.badRequest('image:findOne: fileName is required')
    }

    const avaibleImageStyles = we.config.upload.image.avaibleStyles;

    let imageStyle = req.params.style;
    if (!imageStyle) {
      imageStyle = 'original'
    } else if (imageStyle !== 'original' && avaibleImageStyles.indexOf(imageStyle) === -1) {
      return res.badRequest('image.style.invalid');
    }

    we.db.models.image
    .findOne({
      where: { name: fileName }
    })
    .then(function afterFindOneImage (image) {
      // image not found
      if (!image) {
        we.log.silly('image:findOne: image not found:', fileName);
        return res.notFound();
      }

      we.log.silly('image:findOne: image found:', image.get());

      const storage = we.config.upload.storages[image.storageName];

      if (!storage) return res.serverError('we-plugin-file:findOne:storage:not_found');

      storage.sendFile(image, req, res, imageStyle);

      return null;
    })
    .catch(res.queryError);
  },

  /**
   * Find image by id and returm image model data
   *
   * @apiName image.findOneReturnData
   * @apiGroup image
   *
   * @module Controller
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Function} next Express.js callback
   *
   * @successResponse 200
   */
  findOneReturnData(req, res) {
    const we = req.getWe();

    let fileId = req.params.id;
    if (!fileId) {
      return res.send(404);
    }
    we.db.models.image
    .findOne({
      where: {
        id: fileId
      }
    })
    .then(function afterFindOne (image) {
      if (!image) {
        return res.send(404);
      }
      res.send({
        image: image
      });

      return null;
    })
    .catch( (err)=> {
      we.log.error('Error on get image from BD: ', err, fileId);
      return res.send(404);
    });
  },

  /**
   * Upload file to upload storage set in route and save metadata on database
   *
   * @apiName image.create
   * @apiGroup image
   *
   * @module Controller
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Function} next Express.js callback
   *
   * @successResponse 201
   */
  create(req, res) {
    const we = req.we;
    // images in upload
    let files = req.files;

    if (!files.image || !files.image[0]) return res.badRequest('file.create.image.required');

    let file = files.image[0];

    if (!we.utils._.isObject(file)) return res.badRequest('file.create.image.invalid');

    we.log.verbose('image:create: files.image to save:', file);

    // set default file Name if not set in storage
    if (!file.name) file.name = file.originalname;

    file.urls = {};
    // set the original url for file upploads
    file.urls.original = res.locals.storageStrategy.getUrlFromFile('original', file);
    // set temporary image styles
    let styles = we.config.upload.image.styles;
    for (let sName in styles) {
      file.urls[sName] = we.config.hostname+'/api/v1/image/' + sName + '/' + file.name;
    }

    file.description = req.body.description;
    file.label = req.body.label;
    file.mime = file.mimetype;

    // set storage name
    file.storageName = (res.locals.upload.storageName || we.config.upload.defaultImageStorage);

    file.isLocalStorage = res.locals.storageStrategy.isLocalStorage;

    if (req.isAuthenticated()) file.creatorId = req.user.id;

    res.locals.storageStrategy
    .generateImageStyles(file, (err)=> {
      if (err) return res.serverError(err);

      res.locals.Model
      .create(file)
      .then( (record)=> {
        if (record) we.log.debug('New image record created:', record.get());
        res.created(record);

        return null;
      })
      .catch(res.queryError);
    });
  },

  edit(req, res) {
    const we = req.we;

    let fileId = req.params.imageId;
    if (!fileId) {
      return res.notFound();
    }

    we.db.models.image
    .findOne({
      where: { id: fileId }
    })
    .then(function afterFindOne (image) {
      if (!image) return null;
      image.description = req.body.description;

      return image.save()
      .then( (image)=> {
        res.send({
          image: image
        });
      });
    })
    .catch( (err)=> {
      we.log.error('Error on update image in BD: ', err, fileId);
      return res.serverError(err);
    });
  },

  /**
   * Delete one image
   *
   * @apiName image.destroy
   * @apiGroup image
   *
   * @module Controller
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Function} next Express.js callback
   *
   * @successResponse 201
   */
  destroy(req, res) {
    const we = req.we;

    we.db.models.image
    .findOne({
      where: {
        [we.Op.or]: [
          { name: req.params.name },
          { id: req.params.id }
        ]
      }
    })
    .then( (record)=> {
      if (!record) return res.notFound();

      res.locals.deleted = true;

      var storage = we.config.upload.storages[record.storageName];
      if (!storage) return res.serverError('we-plugin-file:delete:storage:not_found');

      storage.destroyFile(record, function afterDeleteFile(err) {
        if (err) return res.serverError(err);
        return res.deleted();
      });

      return null;
    })
    .catch(res.queryError);
  }
}
