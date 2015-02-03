$(function() {

  App.Images.reopen({
    urls: DS.attr()
  });

  App.ImagesAdapter = App.ApplicationRESTAdapter.extend({
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
          host = Ember.get(this, 'host'),
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

});

Ember.Inflector.inflector.irregular('images', 'images');
Ember.Inflector.inflector.singular(/images/, 'images');