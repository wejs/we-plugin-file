var exec = require('child_process').exec

module.exports = {
  /**
   * Return a list of updates
   *
   * @param  {Object} we we.js object
   * @return {Array}    a list of update objects
   */
  updates: function updates() {
    return [{
      version: '1.2.0',
      update: function (we, done) {

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
    }
    ];
  }
}
