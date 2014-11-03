/**
 * Routes
 *
 * Sails uses a number of different strategies to route requests.
 * Here they are top-to-bottom, in order of precedence.
 *
 * For more information on routes, check out:
 * http://sailsjs.org/#documentation
 */



/**
 * (1) Core middleware
 *
 * Middleware included with `app.use` is run first, before the router
 */


/**
 * (2) Static routes
 *
 * This object routes static URLs to handler functions--
 * In most cases, these functions are actions inside of your controllers.
 * For convenience, you can also connect routes directly to views or external URLs.
 *
 */

module.exports.routes = {

  'get /api/v1/images': {
    controller    : 'images',
    action        : 'find'
  },

  'get /api/v1/images/:name?': {
    controller    : 'images',
    action        : 'findOne'
  },

  // Image style thumbnail | medium | large
  'get /api/v1/images/:style(original|mini|thumbnail|medium|large)/:name': {
    controller    : 'images',
    action        : 'findOne'
  },

  'get /api/v1/images/:id/data': {
    controller    : 'images',
    action        : 'findOneReturnData'
  },

  'get /api/v1/images-crop/:id': {
    controller    : 'images',
    action        : 'cropImage'
  },
  'post /api/v1/images-crop/:id': {
    controller    : 'images',
    action        : 'cropImage'
  },

  'post /api/v1/images': {
    controller    : 'images',
    action        : 'createRecord'
  },

  // -- FILES

  'get /files': {
    controller    : 'files',
    action        : 'find'
  },

  'post /files': {
    controller    : 'files',
    action        : 'create'
  },

};
