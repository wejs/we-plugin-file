(function($, Ember, App){

  App.WeImagePreviewComponent = Ember.Component.extend({
    tagName: 'img',
    width: '100%',
    height: 'auto',
    //onRemove : 'onRemoveImage',
    attributeBindings: ['src','width', 'height'],
    webp: 'auto',
    classNames: ['thumbnail'],
    template: '',
    init: function(){
      this._super();
      var _this = this;
      var file = this.get('file');
      var reader = new FileReader();

      reader.onload = function (e) {
        // get local file src
        _this.set('src', e.target.result);
      };
      reader.readAsDataURL(file);
    },
    click: function(){
      teste = this;
      if(this.get('onRemove')){
        this.sendAction('onRemove', this.get('file'), this);
      }
    }
  });
})(jQuery, Ember, App);
/*

<div class="col-xs-6 col-md-3">
    <a href="#" class="thumbnail">
      <img data-src="holder.js/100%x180" alt="...">
    </a>
  </div>

*/