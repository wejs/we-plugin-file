(function($, Ember, App){

  var attr = DS.attr;
  var get = Ember.get;

  App.Image = DS.Model.extend({
    name: attr('string'),
    size: attr('number'),
    width: attr('string'),
    height: attr('string'),
    originalFilename: attr('string'),
    mime: attr('string'),

    // flags
    active: attr('boolean', {
      defaultValue: true
    }),

    urls: attr(),

    user_id: DS.attr('string'),

    creator: DS.belongsTo('user', {
      async: true,
      inverse: 'images',
    }),

    avatarOf: DS.belongsTo('user', {
      async: true,
      inverse: 'avatar'
    }),

    // post association
    inPost: attr('string'),

    createdAt: attr('date'),
    updatedAt: attr('date')
  });


  App.ImageAdapter = App.ApplicationRESTAdapter.extend({
    namespace: 'api/v1',
    pathForType: function(type) {
       return 'images';
    },
    /**
      Builds a URL for a given type and optional ID.

      By default, it pluralizes the type's name (for example, 'post'
      becomes 'posts' and 'person' becomes 'people'). To override the
      pluralization see [pathForType](#method_pathForType).

      If an ID is specified, it adds the ID to the path generated
      for the type, separated by a `/`.

      @method buildURL
      @param {String} type
      @param {String} id
      @return {String} url
    */
    buildURL: function(type, id) {
      var url = [],
          host = get(this, 'host'),
          prefix = this.urlPrefix();

      if (type) { url.push('images'); }
      if (id) {
        url.push(id);
        url.push('data');
      }

      if (prefix) { url.unshift(prefix); }

      url = url.join('/');
      if (!host && url) { url = '/' + url; }

      return url;
    }
  });


})(jQuery, Ember, App);
