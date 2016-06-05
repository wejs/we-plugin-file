/**
 * ImagesController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */

module.exports = {
  find: function findAll (req, res) {
    if (req.query.selector === 'owner') {
      // see only own images
      res.locals.query.where.creatorId = req.user.id
    } else if (req.we.acl && req.we.acl.canStatic('find_all_system_images', req.userRoleNames)) {
      // can see all images
    } else {
      return res.forbidden()
    }

    return res.locals.Model
    .findAndCountAll(res.locals.query)
    .then(function afterFindAll (record) {
      res.locals.metadata.count = record.count
      res.locals.data = record.rows
      return res.ok()
    })
    .catch(res.queryError)
  },

  findOne: function findOne (req, res) {
    var we = req.we

    var fileName = req.params.name

    if (!fileName) {
      return res.badRequest('image:findOne: fileName is required')
    }

    var avaibleImageStyles = we.db.models.image.getImageStyles()

    var imageStyle = req.params.style
    if (!imageStyle) {
      imageStyle = 'original'
    } else if (imageStyle !== 'original' && avaibleImageStyles.indexOf(imageStyle) === -1) {
      return res.badRequest('image.style.invalid')
    }

    we.db.models.image.findOne({
      where: {
        name: fileName
      }
    })
    .then(function afterFindOneImage (image) {
      // image not found
      if (!image) {
        we.log.silly('image:findOne: image not found:', fileName)
        return res.notFound()
      }

      we.log.silly('image:findOne: image found:', image.get())

      if (image.isLocalStorage) {
        // is local storage ... get or resize
        return we.db.models.image
        .getFileStreamOrResize(fileName, imageStyle, function (err, stream) {
          if (err) {
            we.log.error('Error on getFileStreamOrResize:', fileName, err)
            return res.serverError(err)
          }

          if (!stream) return res.notFound()

          if (image.mime) {
            res.contentType(image.mime)
          } else {
            res.contentType('image/png')
          }

          // set http cache headers
          if (!res.getHeader('Cache-Control')) {
            res.setHeader('Cache-Control', 'public, max-age=' + we.config.cache.maxage)
          }

          res.setHeader('Last-Modified', (new Date(image.updatedAt)).toUTCString())

          stream.pipe(res)

          stream.on('error', function (err) {
            we.log.error('image:findOne: error in send file', err)
          })
        })
      } else {
        // TODO implemente get or sesize for external storages
        res.redirect(image.urls.original)
      }
    })
    .catch(res.queryError)
  },

  /**
   * Find image by id and returm image model data
   */
  findOneReturnData: function findOneReturnData (req, res) {
    var we = req.getWe()

    var fileId = req.params.id
    if (!fileId) {
      return res.send(404)
    }
    we.db.models.image.findOne({
      where: {
        id: fileId
      }
    })
    .then(function afterFindOne (image) {
      if (!image) {
        return res.send(404)
      }
      res.send({
        image: image
      })
    })
    .catch(function (err) {
      we.log.error('Error on get image from BD: ', err, fileId)
      return res.send(404)
    })
  },

  /**
   * Upload file to upload storage set in route and save metadata on database
   */
  create: function createOneImage (req, res) {
    var we = req.we
    // images in upload
    var files = req.files

    if (!files.image || !files.image[0]) return res.badRequest('file.create.image.required')

    var file = files.image[0]

    if (!we.utils._.isObject(file)) return res.badRequest('file.create.image.invalid')

    we.log.verbose('image:create: files.image to save:', file)

    // set default file Name if not set in storage
    if (!file.name) file.name = file.originalname

    file.urls = {}
    // set the original url for file upploads
    file.urls.original = res.locals.getUrlFromFile('original', file)
    // set temporary image styles
    var styles = we.config.upload.image.styles
    for (var sName in styles) {
      file.urls[sName] = '/api/v1/image/' + sName + '/' + file.name
    }

    file.description = req.body.description
    file.label = req.body.label
    file.mime = file.mimetype

    // set storage name
    file.storageName = res.locals.upload.storageName
    file.isLocalStorage = res.locals.isLocalStorage

    if (req.isAuthenticated()) file.creatorId = req.user.id

    res.locals.Model.create(file)
    .then(function afterCreate (record) {
      if (record) we.log.debug('New image record created:', record.get())
      return res.created(record)
    })
    .catch(res.queryError)
  }
}
