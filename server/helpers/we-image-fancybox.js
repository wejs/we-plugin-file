/**
 * We image helper
 *
 * usage: {{we-image-fancybox imageObject style}}
 */

module.exports = function(we) {
  /**
   * Render one image tag from we.js image model
   * @param  {Object} image
   * @param  {String} format
   * @return {String}
   */
  return function render(image, style) {
    var options = arguments[arguments.length-1];
    var html = '';

    if (!image || !image.urls) return html;

    if(!image.urls[style]) style = 'original';

    var attributes = [];
    // pass helper attributes to link element
    for (var attributeName in options.hash) {
      attributes.push(attributeName + '="' + options.hash[attributeName] + '"');
    }

    html += '<a href="'+image.urls.large+'" title="'+image.originalname+'"  '+attributes.join(' ')+' >';
    html +=   '<img alt="'+image.description+'" src="'+image.urls[style]+'" alt="'+image.originalname+'" >';
    html += '</a>';

    return new we.hbs.SafeString(html);
  }
}

