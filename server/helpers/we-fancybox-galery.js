/**
 * We image helper
 *
 * usage: {{we-fancybox-galery images=images id="aUniqueID" style=style}}
 */

module.exports = function(we) {
  /**
   * Render one image tag from we.js image model
   * @param  {Object} image
   * @param  {String} format
   * @return {String}
   */
  return function renderFancyboxImage() {
    var options = arguments[arguments.length-1];
    var html = '';

    if (!options.hash.id) {
      return we.log.warn('ID is required for helper we-fancybox-galery');
    }

    var style =  options.hash.style || 'original';

    var attributes = [];
    // pass helper attributes to link element
    for (var attributeName in options.hash) {
      attributes.push(attributeName + '="' + options.hash[attributeName] + '"');
    }

    html += '<div id="'+options.hash.id+'" class="fancybox-galery">';
      for (var i = options.hash.images.length - 1; i >= 0; i--) {
        html += we.hbs.handlebars.helpers['we-image-fancybox']
        .bind()(options.hash.images[i], style, { hash: {
          rel: options.hash.id
        } });
      }
      html += '<script>$(function(){ $("#'+options.hash.id+' > a").fancybox(); });</script>';
    html += '</div>';

    return new we.hbs.SafeString(html);
  }
}

