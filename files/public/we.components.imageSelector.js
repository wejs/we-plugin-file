/**
 * We.js image selector component client side lib
 *
 * Handle image field selector
 */

(function (we, $) {

we.components.imageSelector = {
  host: '',

  selectImage: function(cb) {
    this.imageSelectedHandler = cb;
    this.modal.modal('show');
  },
  imageSelected: function(err, image) {
    this.imageSelectedHandler(err, image);

    this.modal.modal('hide');
    this.imageSelectedHandler = null;
  },
  imageSelectedHandler: null,
  fileUploadData: null,

  /**
   * Innitializer
   *
   * @param  {String} selector field selector
   */
  init: function init(selector) {
    var self = this;
    this.modal = $(selector);
    this.messagesArea = this.modal.find('.image-uploader-messages');
    this.uploader = this.modal.find('.fileupload');
    this.progress = this.modal.find('.progress');
    this.progressBar = this.progress.find('.progress-bar');

    // Change this to the location of your server-side upload handler:
    this.uploader.fileupload({
      dataType: 'json',
      sequentialUploads: true,
      limitMultiFileUploads: 1,
      add: function (e, data) {
        self.displayThumbnail(data.files[0]);
        self.fileUploadData = data;
        self.goTostep2();
      },
      done: function (e, data) {
        self.fileUploadData = null;

        if (self.imageSelectedHandler) {
          self.imageSelectedHandler(null, data.result.image);
          self.modal.modal('hide');
        } else {
          console.log('TODO show done in image selector modal');
        }

        $('#upload-image-preview-wrapper').html('');
        $('#weImageUploadDescription').val('');
        we.imageSelectedHandler = null;
        self.progress.hide();
        self.progressBar.css( 'width', '0%' );

        self.goTostep1();
      },
      progressall: function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        self.progressBar.css( 'width', progress + '%' );
      },
      fail: function (e, data) {
        var xhr = data.jqXHR;
        if (xhr.responseJSON && xhr.responseJSON.messages) {
          for(var i = 0; i < xhr.responseJSON.messages.length; i++) {
            var msg = xhr.responseJSON.messages[i];
              newMessage(msg.status, msg.message);
          }
        }
      }
    }).prop('disabled', !$.support.fileInput)
    .parent().addClass($.support.fileInput ? undefined : 'disabled');

    function newMessage(status, message) {
     self.messagesArea.append('<div data-dismiss="alert" aria-label="Close" class="alert alert-' + status + '">'+
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'+
          '<span aria-hidden="true">×</span></button>'+
       message + ' </div>');
    }
  },

  goTostep1: function step1() {
    $('#weImageUploadForm .upload-step-1').show();
    $('#weImageUploadForm .upload-step-2').hide();
  },
  goTostep2: function step2() {
    $('#weImageUploadForm .upload-step-1').hide();
    $('#weImageUploadForm .upload-step-2').show();
  },
  saveFile: function saveFile() {
    if ($('#weImageUploadDescription').val())
      this.fileUploadData.submit();


    return false;
  },
  cancelUpload: function cancelUpload() {
    this.fileUploadData = null;
    $('#upload-image-preview-wrapper').html('');
    $('#weImageUploadDescription').val('');
    this.modal.modal('hide');
    this.progress.hide();
    this.goTostep1();
  },

  displayThumbnail: function displayThumbnail(file) {
    var self = this;
    var reader = new FileReader();
    reader.onload = function (e) {
      var $newImageThumbnail = self.makeElement('img',{ class: 'image-frame', width: '150px' ,src: e.target.result});
      $('#upload-image-preview-wrapper').append($newImageThumbnail);
    }
    reader.readAsDataURL(file);
  },
  makeElement: function makeElement(element, options) {
    var $elem = document.createElement(element);
    $.each(options, function (key, value) {
        $elem.setAttribute(key, value);
    });
    return $elem;
  },

  selectImageForField: function(selector, name) {
    var self = this;
    this.selectImage(function (err, image) {
      if (err) throw new Error('Error on select image.');
      self.showFieldImageData(selector, name, image);
    });
  },

  /**
   * Show selected image from data
   *
   * @param  {String} fieldSelector field selector ID
   * @param  {String} name          Field name
   * @param  {[Object} image         Image object
   */
  showFieldImageData: function(fieldSelector, name, image) {
    var row = $(fieldSelector + 'ImageFieldTemplates tr').clone();
    row.find('td[data-image-name]').html(image.originalname + ' : ' +image.description);
    row.find('td[data-image-thumbnail]').html(
      '<img alt="'+image.description+'" src="'+ image.urls.thumbnail +'">' +
      '<input name="'+name+'" type="hidden" value="'+image.id+'">'
    );

    if ($(fieldSelector).attr('data-multiple') !== 'true') {
      console.log('>>', fieldSelector + 'ImageBTNSelector')
      $(fieldSelector + 'ImageBTNSelector').hide();
    }

    $(fieldSelector + 'ImageTable tbody').append(row);
    $(fieldSelector + 'ImageTable').show();
  },

  /**
   * Remove image from selected images list
   *
   * @param  {Object} e
   * @param  {String} selector field selector
   */
  removeImage: function(e, selector) {
    var tbody = $(e).parent().parent().parent();
    $(e).parent().parent().remove();

    if (!tbody.find('tr').length) {
      $(selector + 'ImageBTNSelector').show();
      $(selector + 'ImageTable').hide();
    }
  },

  startImageBrowser: function(selector) {
    var container = $(selector);
    container.text('');
    this.loadImages(container);
  },

  loadImages: function(container) {
    var self = this;
    this.getImagesFromServer().then(function (res){
      res.image.forEach(function (image){
        container.append(self.renderImage(image, 'medium'));
      });
    });
  },

  /**
   * Generate one image HTML
   *
   * @param  {Object} image
   * @param  {String} style Image style, original, large, medium or thumbnail
   * @return {Object}       Jquery HTML object
   */
  renderImage: function(image, style) {
    var self = this;
    var img = document.createElement('img');
    img.src = image.urls[style];
    img.onclick = function() {
      if (self.imageSelected) {
        self.imageSelected(null, this);
      }
    }.bind(image)
    return $(img);
  },

  /**
   * Ger images from image server
   *
   * @return {Object} jquery GET ajax promisse
   */
  getImagesFromServer: function() {
    var cfgs = {
      url: this.host + '/api/v1/image',
      type: 'GET',
      dataType: 'json',
      cache: false,
      headers: { Accept : 'application/json' }
    };

    return $.ajax(cfgs);
  }
}

})(window.we, window.jQuery);