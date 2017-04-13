/**
 * AvatarController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
const fs = require('fs');

module.exports = {
  /**
   * Get user avatar with user id, redirect to avatar url if exists or send the default user avatar
   *
   */
  getAvatar(req, res) {
    const we = req.we,
      id = req.params.id;

    const avaibleImageStyles = we.config.upload.image.avaibleStyles;

    let imageStyle = req.params.style;
    if (!imageStyle) {
      imageStyle = 'original'
    } else if (imageStyle !== 'original' && avaibleImageStyles.indexOf(imageStyle) === -1) {
      return res.badRequest('image.style.invalid');
    }

    const defaultAvatarPath = we.config.defaultUserAvatar;

    if (!id) return res.forbidden();

    we.db.models.user
    .findById(id)
    .then( (user)=> {
      if (user && user.avatar && user.avatar[0]) {
        // if user have avatar
        let image = user.avatar[0];
        // redirect to avatar image if exists:
        res.goTo(image.urls[imageStyle]);
      } else {
        // else send the default
        fs.readFile(defaultAvatarPath, (err, contents)=> {
          if (err) return res.serverError(err);
          res.contentType('image/png');
          res.send(contents);
        });
      }

      return null;
    })
  },

  changeAvatar(req, res) {
    if (!req.isAuthenticated()) return res.forbidden();
    if (!res.locals.data) return res.notFound();

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
