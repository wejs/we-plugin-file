module.exports = {
  /**
   * Upload one file to upload dir and save metadata on database
   */
  create: function createOneImage (req, res) {
    var we = req.we
    // files in upload
    var files = req.files

    if (!files.file && files.file[0]) return res.badRequest('file.create.file.required')

    var file = files.file[0]

    if (!we.utils._.isObject(file)) return res.badRequest('file.create.file.invalid')

    we.log.verbose('file:create: files.file to save:', file)

    file.mime = file.mimetype
    // set creator
    if (req.isAuthenticated()) file.creatorId = req.user.id
    // set default file Name if not set in storage
    if (!file.name) file.name = file.originalname
    // set storage name
    file.storageName = (res.locals.upload.storageName || we.config.upload.defaultFileStorage)
    file.isLocalStorage = res.locals.storageStrategy.isLocalStorage

    file.urls = {}
    // set the original url for file upploads
    file.urls.original = res.locals.storageStrategy.getUrlFromFile('original', file)

    res.locals.Model.create(file)
    .then(function afterCreateAndUpload (record) {
      we.log.debug('New file record created:', record.get())
      res.created(record)
    })
    .catch(res.queryError)
  },

  download: function download (req, res) {
    var we = req.we
    var fileName = req.params.name

    if (!fileName) {
      return res.badRequest('file:download: fileName is required')
    }

    req.we.db.models.file.findOne({
      where: {
        name: fileName
      }
    })
    .then(function afterFind (file) {
      // file not found
      if (!file) {
        req.we.log.silly('file:download: file not found:', fileName)
        return res.notFound()
      }

      // if (!file.isLocalStorage) {
      //   if (!file.urls.original) return res.notFound('original file not found')
      //   // not is local, then redirect to permanent link
      //   return res.redirect(file.urls.original)
      // }

      var storage = we.config.upload.storages[file.storageName];
      if (!storage) return res.serverError('we-plugin-file:findOne:storage:not_found')

      storage.sendFile(file, req, res)
    })
    .catch(res.queryError)
  },

  getFormModalContent: function getFormModalContent (req, res) {
    // only works with we-plugin-view
    if (!req.we.view) return res.notFound()

    res.send(
      req.we.view.renderTemplate('form-' + req.params.type + '-modal-content', res.locals.theme, res.locals)
    )
  },

  destroy: function destroyFile (req, res) {
    var we = req.we

    we.db.models.file.findOne({
      where: { name: req.params.name }
    })
    .then(function afterDelete(record) {
      if (!record) return res.notFound()

      res.locals.deleted = true;

      var storage = we.config.upload.storages[record.storageName];
      if (!storage) return res.serverError('we-plugin-file:delete:storage:not_found')

      storage.destroyFile(record, function afterDeleteFile(err) {
        if (err) return res.serverError(err)
        return res.deleted()
      })

    })
    .catch(res.queryError)
  }
}
