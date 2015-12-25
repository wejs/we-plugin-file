/**
 * We.js user avatar render
 *
 * usage: {{we-avatar id=userId style=style}}
 */

module.exports = function(we) {
  /**
   * Render one user avatar
   * @return {String}
   */
  return function render() {
    var options = arguments[arguments.length-1];
    var html = '';
    if (!options.hash.id) {
      we.log.warn('id is required for we-avatar-helper');
      return '';
    }

    if(!options.hash.style) options.hash.style = 'original';

    var attributes = we.utils.helper.parseAttributes(options);

    html += '<img src="/avatar/'+options.hash.id+'" '+attributes+' >';

    return new we.hbs.SafeString(html);
  }
}