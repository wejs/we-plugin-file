/**
 * We.js client side lib
 */

(function (we) {

if (!we.cache) we.cache = {};
we.cache.files = {};
we.cache.findFile = function findFile(id) {
  if (we.cache.files[id]) return we.cache.files[id];

  we.cache.files[id] = $.ajax({
    method: 'get',
    url: '/api/v1/file/'+id,
    dataType: 'json',
    headers: { Accept : 'application/json' }
  });

  return we.cache.files[id];
};

we.components.fileSelector = {
  formModalContentIsLoad: true,

  selectFile: function(cb) {
    this.fileSelectedHandler = cb;

    this.loadFormModalContentFromServer(function() {
      this.modal.modal('show');
    }.bind(this));
  },

  loadFormModalContentFromServer: function(cb) {
    var self = this;

    if (self.formModalContentCache) return cb(null, self.formModalContentCache);

    $.ajax({
      url: '/api/v1/file/get-form-modal-content'
    }).then(function (html) {
      self.formModalContentCache = html;

      $('body').append(html);
      we.components.fileSelector.init('#fileSelectorFormModal');

      cb(null, self.formModalContentCache);
    });
  },
  fileSelected: function(err, file) {
    this.fileSelectedHandler(err, file);
    this.modal.modal('hide');
    this.fileSelectedHandler = null;
  },
  fileSelectedHandler: null,
  init: function init(selector) {
    var self = this;
    this.modal = $(selector);
    this.messagesArea = this.modal.find('.file-uploader-messages');
    this.uploader = this.modal.find('.fileupload');
    this.progress = this.modal.find('.progress');
    this.progressBar = this.progress.find('.progress-bar');

    // Change this to the location of your server-side upload handler:
    this.uploader.fileupload({
      dataType: 'json',
      sequentialUploads: true,
      add: function (e, data) {
        data.submit();
        self.progress.show();
      },
      done: function (e, data) {
        if (self.fileSelectedHandler) {
          self.fileSelectedHandler(null, data.result.file);
          self.modal.modal('hide');
        } else {
          console.log('TODO show done in file selector modal');
        }
        we.fileSelectedHandler = null;
        self.progress.hide();
        self.progressBar.css( 'width', '0%' );
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
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>' +
       message + ' </div>');
    }

  },
  selectFileForField: function(selector, name) {
    var self = this;
    this.selectFile(function (err, file) {
      if (err) throw new Error('Error on select file.');
      self.showFieldFileData(selector, name, file);
    });
  },

  showFieldFileData: function(fieldSelector, name, file) {
    var row = $(fieldSelector + 'FileFieldTemplates tr').clone();
    row.find('td[data-file-name]').html(
      file.originalname +
      '<input name="'+name+'" type="hidden" value="'+file.id+'">'
    );

    if ($(fieldSelector).attr('data-multiple') !== 'true'){
      $(fieldSelector + 'FileBTNSelector').hide();
    }

    $(fieldSelector + 'FileTable tbody').append(row);
    $(fieldSelector + 'FileTable').show();
  },

  removeFile: function(e, selector) {
    var tbody = $(e).parent().parent().parent();
    $(e).parent().parent().remove();

    if (!tbody.find('tr').length) {
      $(selector + 'FileBTNSelector').show();
      $(selector + 'FileTable').hide();
    }
  }
}

})(window.we);

window.addEventListener('WebComponentsReady', function() {
  var we = window.we;

  /**
   *  -- Image description component
   *  usage: <we-image-description data-id="{{id}}"></we-image-description>
   */
  class WeFileDescription extends HTMLElement {
    constructor() {
      super();

      var self = this;

      var id = this.dataset.id;
      if (!id) return console.warn('data-id is required for we-file-description');

      we.cache.findFile(id).then(function (result) {
        self.textContent = result.file.originalname;
      });
    }

  }

  window.customElements.define('we-file-description', WeFileDescription);

});

