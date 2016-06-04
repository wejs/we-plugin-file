/**
 * We image helper
 *
 * usage: {{we-image imageObject style}}
 */

module.exports = function (we) {
  /**
   * Render one image tag from we.js image model
   * @param  {Object} image
   * @param  {String} format
   * @return {String}
   */
  return function render (imageObj, style) {
    var options = arguments[arguments.length - 1]
    var html = ''
    var image

    if (we.utils._.isArray(imageObj)) {
      image = imageObj[0]
    } else {
      image = imageObj
    }

    if (!image || !image.urls) return html

    if (!image.urls[style]) style = 'original'

    var attributes = we.utils.helper.parseAttributes(options)

    html += '<img alt="' + image.description + '" src="' + image.urls[style] + '" ' + attributes + ' >'

    return new we.hbs.SafeString(html)
  }
}
