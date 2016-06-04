/**
 * AvatarController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
var fs = require('fs')

module.exports = {
  /**
   * Get user avatar with user id
   *
   */
  getAvatar: function getAvatar (req, res) {
    var we = req.we

    var id = req.params.id
    var style = req.params.style

    if (style === 'responsive') {
      style = 'large'
    } else if (!style) {
      style = 'thumbnail'
    }

    var defaultAvatarPath = we.config.defaultUserAvatar
    if (!id) return res.forbidden()

    we.db.models.user.findById(id)
    .then(function (user) {
      if (user && user.avatar && user.avatar[0]) {
        // if user have avatar
        var image = user.avatar[0]

        we.db.models.image.getFileStreamOrResize(image.name, style, function (err, stream) {
          if (err) {
            we.log.error('Error on get avatar: ', err)
            return res.serverError()
          }
          if (!stream) return res.notFound()

          if (image.mime) {
            res.contentType(image.mime)
          } else {
            res.contentType('image/png')
          }

          stream.pipe(res)

          stream.on('error', function (err) {
            we.log.error('image:findOne: error in send file', err)
          })
        })
      } else {
        // else send the default
        fs.readFile(defaultAvatarPath, function (err, contents) {
          if (err) return res.serverError(err)
          res.contentType('image/png')
          res.send(contents)
        })
      }
    })
  },

  changeAvatar: function changeAvatar (req, res) {
    if (!req.isAuthenticated()) return res.forbidden()
    if (!res.locals.data) return res.notFound()

    var we = req.we

    var imageId = req.body.image

    we.db.models.image.findOne({
      where: {
        id: imageId
      }
    }).then(function (image) {
      we.log.warn(image.get(), req.user.id)

      if (!image || req.user.id !== image.creatorId) {
        we.log.debug('User:avatarChange:User dont are image woner or image not found', req.user, image)
        return res.forbidden()
      }

      // set current user vars
      req.user.avatar = image.id

      // update db user
      res.locals.data
      .setAvatar(image)
      .then(function afterSetAvatar () {
        res.send({
          'user': req.user
        })
      })
    })
  }
}
