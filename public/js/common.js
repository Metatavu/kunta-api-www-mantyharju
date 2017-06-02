(function () {
  'use strict';
  
  $.widget("custom.menuSearch", {
    
    _create : function() {
      this._searching = false;
      this.element.append($('<div>').addClass('search-results').hide());
      this.element.find('input').on("keyup", $.proxy(this._onInputKeyUp, this));
      this.element.find('input').on("focus", $.proxy(this._onInputFocus, this));
      $(window).click($.proxy(this._onWindowClick, this));
    },
    
    _getSearch: function () {
      return $.trim(this.element.find('input').val());
    },
    
    _search: function () {
      var search = this._getSearch();
      if (search) {
        if (!this._searching) {
          this._searching = true;
          this.element.addClass('searching');
          $.ajax({
            url : '/ajax/search/',
            data : {
              search: search
            },
            success : $.proxy(function(data) {
              this._searching = false;
              this.element
                .find('.search-results')
                .html(data)
                .show();
              
              if (search != this._getSearch()) {
                this._search();
              } else {
                this.element.removeClass('searching');
              }
            }, this)
          });
        }
      } else {
        this.element.find('.search-results').hide();
      }
    },
    
    _onInputKeyUp: function () {
      this._search();
    },
    
    _onInputFocus: function () {
      this._search();
    },
    
    _onWindowClick: function (event) {
      if (!$(event.target).closest('.nav-search-container').length) {
        this.element.find('.search-results').hide();
      }
    }
  
  });
  
  $.widget("custom.lazyBackgroundImage", {
    
    _create : function() {
      this._preloaderImage = new Image();
      this._preloaderImage.onload = $.proxy(this._onPreloadImageLoad, this);
      this._preloaderImage.src = this._resolveUrl();
    },
    
    _resolveSize: function () {
      var imageSizeAttr = this.element.attr('data-lazy-bg-size');
      if (imageSizeAttr) {
        if ($.isNumeric(imageSizeAttr)) {
          return parseInt(imageSizeAttr);
        } else {
          return Math.round(Math.max($(imageSizeAttr).width(), $(imageSizeAttr).height()));
        }
      }
      
      return Math.round(Math.max(this.element.width(), this.element.height()));
    },
  
    _resolveUrl: function () {
      return this.element.attr('data-lazy-bg-image') + '?size=' + this._resolveSize();
    },
    
    _onPreloadImageLoad: function () {
      this.element.css({
        'background-image': 'url(' + this._preloaderImage.src + ')'
      })
      .removeAttr('data-lazy-bg-image');
    }
    
  });

  $(document).ready(function () {
    $('*[data-lazy-bg-image]').each(function (index, element) {
      $(element).lazyBackgroundImage();
    });
    
    $('.nav-search-container').menuSearch();
  });
  
}).call(this);