const exec = require('child_process').exec;

module.exports = {
  /**
   * Return a list of updates
   *
   * @param  {Object} we we.js object
   * @return {Array}    a list of update objects
   */
  updates() {
    return [{
      version: '1.2.0',
      update(we, done) {

        we.utils.async.series([
          function (done) {
            we.db.defaultConnection
            .transaction(function () {
              return we.db.Sequelize.Promise.all([
                we.db.defaultConnection.query('ALTER TABLE `images` ADD '+
              ' COLUMN `storageName` VARCHAR(255) NULL ;'),
                we.db.defaultConnection.query('ALTER TABLE `images` ADD '+
              ' COLUMN `isLocalStorage` TINYINT(1) DEFAULT 1;'),
                we.db.defaultConnection.query('ALTER TABLE `images` ADD '+
              ' COLUMN `urls` BLOB NULL ;'),
                we.db.defaultConnection.query('ALTER TABLE `images` ADD '+
              ' COLUMN `extraData` BLOB NULL ;'),
                we.db.defaultConnection.query('ALTER TABLE `files` ADD '+
              ' COLUMN `storageName` VARCHAR(255) NULL ;'),
                we.db.defaultConnection.query('ALTER TABLE `files` ADD '+
              ' COLUMN `isLocalStorage` TINYINT(1) DEFAULT 1;')    ,
                we.db.defaultConnection.query('ALTER TABLE `files` ADD '+
              ' COLUMN `urls` BLOB NULL ;'),
                we.db.defaultConnection.query('ALTER TABLE `files` ADD '+
              ' COLUMN `extraData` BLOB NULL ;')
              ]);
            })
            .nodeify(done);
          },
          function istallLocalStorage(done) {
            exec('npm install we-plugin-file-local', function (error) {
              if (error) {
                we.log.warn('we-plugin-file-local:'+
                  'error in install we-plugin-file-local, run npm i --save we-plugin-file-local to enable local upload')
              }
              return done()
            })
          }
        ], done);
      }
    },
    {
      version: '1.3.1',
      update(we, done) {
        let imageStrategy = we.config.upload.storages.localImages;
        let fileStrategy = we.config.upload.storages.localFiles;
        let styles = we.config.upload.image.styles;

        we.utils.async.series([
          function (done) {
            we.db.models.image
            .findAll({
              where: {
                storageName: null
              }
            })
            .then(function (r) {
              we.utils.async.eachSeries(r, function (file, next) {
                file.storageName = 'localImages';
                let urls = {
                  original: imageStrategy.getUrlFromFile('original', file)
                }

                for (let sName in styles) {
                  urls[sName] = '/api/v1/image/' + sName + '/' + file.name
                }

                file.urls = urls;

                file.save().nodeify(next);
              }, done);
              return null;
            })
            .catch(done);
          },
          function (done) {
            we.db.models.file
            .findAll({
              where: {
                storageName: null
              }
            })
            .then(function (r) {
              we.utils.async.eachSeries(r, function (file, next) {
                file.storageName = 'localFiles';
                file.urls = {
                  original: fileStrategy.getUrlFromFile('original', file)
                }

                file.save().nodeify(next);
              }, done);
              return null;
            })
            .catch(done);
          }
        ], done);
      }
    }
    ];
  }
}