/* global bootbox */

(function () {
  'use strict';
  
  $(document).on("click", ".new-place-link", function (event) {
    event.preventDefault();
    
    $.get('/ajax/linkedevents/places/new', function (response) {
      var dialog = bootbox.dialog({ 
        title: 'Uusi tapahtumapaikka',
        message: response,
        className: "new-place-dialog"
      });
      
      $('.new-place-dialog .metaform').metaform({
        onPostSuccess: function (response) {
          var value = response.id;
          var label = response.name.fi || response.name.sv || response.name.en;
          
          $('#field-location').metaformAutocomplete('val', {
            value: value,
            label: label
          });
           
          dialog.modal("hide");
        }
      });
    });
    
  });
  
}).call(this);