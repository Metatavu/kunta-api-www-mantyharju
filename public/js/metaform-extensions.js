(function () {
  'use strict';

  $(document).ready(function () {
    $(document).find('.file-component').on('metaform:file-added', function () {
      $('input[name="image-url"]').val('');
      $('input[name="image-url"]').attr('disabled', 'disabled');
    });
    
    $(document).find('.file-component').on('metaform:file-removed', function () {
      $('input[name="image-url"]').removeAttr('disabled', 'disabled');
    });
  });
}).call(this);