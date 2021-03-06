const projectPath = process.cwd(),
  deleteDir = require('rimraf'),
  testTools = require('we-test-tools'),
  path = require('path');

let we;

before(function(callback) {
  this.slow(100);
  this.timeout(30000);

  testTools.copyLocalSQLiteConfigIfNotExists(projectPath, function() {
    let We = require('we-core');
    we = new We();

    testTools.init({}, we);

    we.bootstrap({
      i18n: {
        directory: path.join(__dirname, 'locales'),
        updateFiles: true
      }
    } , function(err, we) {
      if (err) throw err;

      we.startServer(function(err) {
        if (err) throw err;
        callback();
      });
    });
  });
});

//after all tests
after(function (callback) {
  testTools.helpers.resetDatabase(we, function(err) {
    if(err) return callback(err);

    we.db.defaultConnection.close();

    var tempFolders = [
      projectPath + '/database-test.sqlite',
      projectPath + '/files/public/min',
      projectPath + '/files/public/tpls.hbs.js',
      projectPath + '/files/public/admin.tpls.hbs.js',
      projectPath + '/files/public/project.css',
      projectPath + '/files/public/project.js',
      projectPath + '/config/local.js'
    ];

    we.utils.async.each(tempFolders, function(folder, next){
      deleteDir( folder, next);
    }, function(err) {
      if (err) throw new Error(err);
      callback();
    });
 });
});

after(function () {
  we.exit(process.exit);
});