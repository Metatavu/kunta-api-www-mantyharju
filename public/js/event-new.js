/* global bootbox,$ */

(function () {
  "use strict";
  
  $(document).on("click", ".new-place-link", function (event) {
    event.preventDefault();
    
    $.get("/ajax/linkedevents/places/new", function (response) {
      var dialog = bootbox.dialog({ 
        title: "Uusi tapahtumapaikka",
        message: response,
        className: "new-place-dialog"
      });
      
      $(".new-place-dialog .metaform").metaform({
        onPostSuccess: function (response) {
          var value = response.id;
          var label = response.name.fi || response.name.sv || response.name.en;
          
          $("#field-location").metaformAutocomplete("val", {
            value: value,
            label: label
          });

          dialog.modal("hide");
        }
      });
    });
    
  });

  $(document).ready(function () {
    $(".metaform").metaform("option", "onPostSuccess", function (response) {
      bootbox.alert({
        message: "<i class=\"fa fa-check\" /><h3>Tapahtuma  on lähetetty ylläpidolle arvioitavaksi.</h3>",
        backdrop: true,
        callback: function(){
          window.location.reload(true);
        }
      });
    });

    $(".form-control").addClass("pristine");

    $(".form-control").focus(function(){
      $(this).removeClass("pristine");
    });

    $(".form-control").change(function(){
      $(this).removeClass("pristine");
    });

    $(document).on("click", ".flatpickr-input", function(){
      $(this).removeClass("pristine");
    });

    $(".metaform").addClass("ready");
  });
  
}).call(this);