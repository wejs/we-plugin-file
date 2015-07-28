/**
 * We.js client side lib
 */

(function (we) {

we.components.fileSelector = {
  selectFile: function(cb) {
    this.fileSelectedHandler = cb;

    this.modal.modal('show');
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
          self.fileSelectedHandler(null, data.result.file[0]);
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

  showFieldFileSelector: function(fieldSelector) {

  },

  showFieldFileData: function(fieldSelector, name, file) {
    var row = $(fieldSelector + 'FileFieldTemplates tr').clone();
    row.find('td[data-file-name]').html(
      file.originalname +
      '<input name="'+name+'" type="hidden" value="'+file.id+'">'
    );

    $(fieldSelector + 'FileBTNSelector').hide();
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