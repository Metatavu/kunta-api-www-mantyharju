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

  $.widget("custom.eventDates", {

    /**
     * Constructor
     */
    _create: function() {
      flatpickr("#field-start-date", {}).destroy();
      flatpickr("#field-end-date", {}).destroy();

      this.startPicker = $("#field-start-date").flatpickr({
        "locale": "fi",
        "altFormat": "d.m.Y H:i",
        "altInput": true,
        "utc": true,
        "allowInput": true,
        "enableTime" : true,
        "time_24hr": true,
        "minDate": new Date(),
        "onChange": $.proxy(this.onStartDateChange, this)
      });

      this.endPicker = $("#field-end-date").flatpickr({
        "locale": "fi",
        "altFormat": "d.m.Y H:i",
        "altInput": true,
        "utc": true,
        "allowInput": true,
        "enableTime" : true,
        "time_24hr": true,
        "minDate": new Date(),
        "onChange": $.proxy(this.onEndDateChange, this)
      });

    },

    /**
     * Event handler for start date change
     * 
     * @param {Date} selectedDates date object
     * @param {string} dateStr date as string 
     * @param {any} instance flatpickr instance
     */
    onStartDateChange: function (selectedDates, dateStr, instance) {
      this.endPicker.set("minDate", selectedDates[0]);
    }

  });

  $.widget("custom.eventDefaultImages", {
    
    _create: function() {
      this.element.addClass("row");

      var images = this.options.images;
      for (var i = 0; i < images.length; i++) {
        this._addImage(images[i]);
      }
    },

    _addImage: function (url) {
      var img = $("<img>").attr("src", url).click($.proxy(this._onImageClick, this));
      var container = $("<div>").addClass("default-image col-xs-12 col-md-8").append(img);
      this.element.append(container);
    },

    _onImageClick: function (e) {
      e.preventDefault();
      var image = $(e.target);
      var container = image.closest(".default-image");
      var isSelected = container.hasClass("selected-image");

      this.element.find(".selected-image").removeClass("selected-image");
      
      if (isSelected) {
        container.removeClass("selected-image");
        this.element.closest(".metaform").find("input[name=\"default-image-url\"]").removeAttr("value");
      } else {
        container.addClass("selected-image");
        this.element.closest(".metaform").find("input[name=\"default-image-url\"]").val(image.attr("src"));
      }
    }
  });

  $(document).ready(function () {
    $(".metaform").metaform("option", "onPostSuccess", function () {
      bootbox.alert({
        message: "<i class=\"fa fa-check\" /><h3>Tapahtuma  on lähetetty ylläpidolle arvioitavaksi.</h3>",
        backdrop: true,
        callback: function(){
          window.location.reload(true);
        }
      });
    });

    $(".metaform").eventDates();

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

    $("input[name='language-fi']")
      .prop("checked", "checked")
      .change();

    $(".metaform .default-images").eventDefaultImages({
      images: JSON.parse($("input[name=\"default-images\"]").val())
    });

    $(".metaform").addClass("ready");
  });
  
}).call(this);