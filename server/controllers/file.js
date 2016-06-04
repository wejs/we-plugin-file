module.exports = {
  /**
   * Upload one file to upload dir and save metadata on database
   */
  create: function createOneImage(req, res) {
    var we = req.we;
    // files in upload
    var files = req.files;

    if (!files.file && files.file[0]) return res.badRequest('file.create.file.required');

    if (!we.utils._.isObject(files.file[0])) return res.badRequest('file.create.file.invalid');

    we.log.verbose('file:create: files.file to save:', files.file[0]);

    files.file[0].mime = files.file[0].mimetype;
    if (req.isAuthenticated()) files.file[0].creatorId = req.user.id;

    console.log('<<<files', files);

    res.locals.Model.create(files.file[0])
    .then(function afterCreateAndUpload(record) {
      if (record) we.log.debug('New file record created:', record.get());
      return res.created(record);
    });
  },

  download: function download(req, res) {
    var fileName = req.params.name;

    if (!fileName) {
      return res.badRequest('file:download: fileName is required');
    }

    req.we.db.models.file.findOne({
      where: { name: fileName}
    }).then(function afterFind(file) {
      // file not found
      if (!file) {
        req.we.log.silly('file:download: file not found:', fileName);
        return res.notFound();
      }

      var filePath = file.getFilePath();
      res.download(filePath);
    }).catch(res.queryError);
  },


  getFormModalContent: function getFormModalContent(req, res) {
    res.send(
      req.we.view.renderTemplate('form-'+req.params.type+'-modal-content', res.locals.theme, res.locals)
    );
  }

};