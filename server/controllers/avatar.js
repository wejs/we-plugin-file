/**
 * AvatarController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
const fs = require('fs');

module.exports = {
  /**
   * Get user avatar with user id
   *
   */
  getAvatar(req, res) {
    const we = req.we,
      id = req.params.id;

    let style = req.params.style;

    if (style === 'responsive') {
      style = 'large';
    } else if (!style) {
      style = 'thumbnail';
    }

    const defaultAvatarPath = we.config.defaultUserAvatar;

    if (!id) return res.forbidden();

    we.db.models.user
    .findById(id)
    .then( (user)=> {
      if (user && user.avatar && user.avatar[0]) {
        // if user have avatar
        let image = user.avatar[0]

        we.db.models.image.getFileStreamOrResize(image.name, style, (err, stream)=> {
          if (err) {
            we.log.error('Error on get avatar: ', err);
            return res.serverError();
          }
          if (!stream) return res.notFound();

          if (image.mime) {
            res.contentType(image.mime);
          } else {
            res.contentType('image/png');
          }

          stream.pipe(res);

          stream.on('error', function (err) {
            we.log.error('image:findOne: error in send file', err);
          })
        })
      } else {
        // else send the default
        fs.readFile(defaultAvatarPath, (err, contents)=> {
          if (err) return res.serverError(err);
          res.contentType('image/png');
          res.send(contents);
        });
      }

      return null
    })
  },

  changeAvatar(req, res) {
    if (!req.isAuthenticated()) return res.forbidden()
    if (!res.locals.data) return res.notFound()

    const we = req.we,
      imageId = req.body.image;

    we.db.models.image
    .findOne({
      where: {
        id: imageId
      }
    })
    .nodeify( (err, image)=> {
      if (err) return res.queryError(err);

      we.log.warn(image.get(), req.user.id);

      if (!image || req.user.id !== image.creatorId) {
        we.log.debug('User:avatarChange:User dont are image woner or image not found', req.user, image);
        return res.forbidden();
      }

      // set current user vars
      req.user.avatar = image.id

      // update db user
      return res.locals.data
      .setAvatar(image)
      .then(function afterSetAvatar () {
        res.send({ 'user': req.user });
        return null
      })
      .catch(res.queryError);
    });
  }
}
