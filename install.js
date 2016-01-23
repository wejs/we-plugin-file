var exec = require('child_process').exec;

module.exports = {
  /**
   * Install function run in we.js install.
   *
   * @param  {Object}   we    we.js object
   * @param  {Function} done  callback
   */
  install: function install(we, done) {
    exec('gm version', function (error) {
      if (error) {
        return done('Requirement GraphicsMagick not found or not instaled, see: https://github.com/aheckmann/gm');
      }
      return done();
    });
  }
};