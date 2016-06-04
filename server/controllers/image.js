/**
 * ImagesController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
var gm = require('gm')

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

    return res.locals.Model.findAndCountAll(res.locals.query)
    .then(function (record) {
      res.locals.metadata.count = record.count
      res.locals.data = record.rows
      return res.ok()
    })
    .catch(res.queryError)
  },

  findOne: function findOne (req, res) {
    var we = req.getWe()

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
    .then(function (image) {
      // image not found
      if (!image) {
        we.log.silly('image:findOne: image not found:', fileName)
        return res.notFound()
      }

      we.log.silly('image:findOne: image found:', image.get())

      we.db.models.image.getFileStreamOrResize(fileName, imageStyle, function (err, stream) {
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
    })
    .catch(res.queryError)
  },

  /**
   * Find image by id and returm image model data
   */
  findOneReturnData: function (req, res) {
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
    }).catch(function (err) {
      we.log.error('Error on get image from BD: ', err, fileId)
      return res.send(404)
    })
  },

  /**
   * Upload file to upload dir and save metadata on database
   */
  create: function createOneImage (req, res) {
    var we = req.we
    // images in upload
    var files = req.files

    if (!files.image || !files.image[0]) return res.badRequest('file.create.image.required')

    if (!we.utils._.isObject(files.image[0])) return res.badRequest('file.create.image.invalid')

    we.log.verbose('image:create: files.image to save:', files.image[0])

    // get image size
    gm(files.image[0].path).size(function (err, size) {
      if (err) {
        we.log.error('image.create: Error on get image file size:', err, files.image)
        return res.serverError(err)
      }

      files.image[0].width = size.width
      files.image[0].height = size.height
      files.image[0].description = req.body.description
      files.image[0].label = req.body.label
      files.image[0].mime = files.image[0].mimetype

      if (req.isAuthenticated()) files.image[0].creatorId = req.user.id

      res.locals.Model
      .create(files.image[0])
      .then(function (record) {
        if (record) we.log.debug('New image record created:', record.get())
        return res.created(record)
      })
      .catch(res.queryError)
    })
  },

  /**
   * Crop one file by file id
   */
  cropImage: function cropImage (req, res) {
    var we = req.we

    if (!res.locals.data) return res.notFound()

    var cords = {}
    cords.width = req.body.w
    cords.height = req.body.h
    cords.x = req.body.x
    cords.y = req.body.y

    if (!cords.width || !cords.height || cords.x === null || cords.y === null) {
      return res.badRequest('Width, height, x and y params is required')
    }

    var originalFile = we.db.models.image.getImagePath('original', res.locals.data.name)

    we.log.verbose('resize image to:', cords)

    we.db.models.image
    .resizeImageAndReturnSize(originalFile, cords, function (err, size) {
      if (err) return res.serverError(err)

      res.locals.data.width = size.width
      res.locals.data.height = size.height

      // save the new width and height on db
      res.locals.data.save().then(function () {
        we.log.verbose('result:', size.width, size.width)

        // delete old auto generated image styles
        we.db.models.image
        .deleteImageStylesWithImageName(res.locals.data.name, function (err) {
          if (err) {
            we.log.error('Error on delete old image styles:', res.locals.data, err)
            return res.send(500)
          }

          res.send({
            image: res.locals.data
          })
        })
      })
    })
  }
}
