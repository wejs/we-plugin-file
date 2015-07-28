module.exports = {
  /**
   * Upload file to upload dir and save metadata on database
   */
  create: function createOneImage(req, res) {
    var we = req.getWe();
    var _ = we.utils._;
    // files in upload
    var files = req.files;

    if (!files.file) return res.badRequest('file.create.file.required');

    if (!_.isObject(files.file)) return res.badRequest('file.create.file.invalid');

    we.log.verbose('file:create: files.file to save:', files.file);

    files.file.mime = files.file.mimetype;
    if (req.isAuthenticated()) files.file.creatorId = req.user.id;

    res.locals.Model.create(files.file)
    .then(function (record) {
      if (record) we.log.debug('New file record created:', record.get());
      return res.created(record);
    });
  },

};