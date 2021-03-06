(function () {
  'use strict';
  
  $.widget("custom.contentsNav", {
    
    options: {
      rootPath: null  
    },
    
    _create : function() {
      $(document).on('click', '.page-nav .page-nav-item .open-folder', $.proxy(this._onOpenFolderClick, this));
      this._resolvePaths(document);
    },
    
    _resolvePaths: function (container) {
      $(container).find('.page-nav-link').each($.proxy(function (index, link) {
        $(link).attr('href', this.options.rootPath + '/' + this._resolvePath(link));
      }, this));
    },
    
    _loadItems: function (path, pageId, callback) {
      $.ajax('/ajax/pagenav?pageId=' + pageId, {
        success: $.proxy(function (html) {
          callback(null, html);
        }, this),
        error: $.proxy(function (jqXHR, textStatus) {
          callback(textStatus);
        }, this)
      });
    },
    
    _resolvePath: function (link) {
      var slugs = [];
      
      $(link).parents('.page-nav-item').each(function (index, item) {
        slugs.unshift($(item).find('[data-slug]').attr('data-slug'));
      });
      
      return slugs.join('/');
    },
    
    _onOpenFolderClick: function (event) {
      event.preventDefault();
      var openLink = $(event.target);
      var item = openLink.closest('.page-nav-item');
      if (item.hasClass('open')) {
        item.addClass('closed').removeClass('open');
        return;
      }
      
      if (item.hasClass('closed')) {
        item.addClass('open').removeClass('closed');
        return;
      }
      
      item.addClass('loading');

      var path = openLink.attr('data-path');
      var pageId = openLink.attr('data-page-id');
      this._loadItems(path, pageId, $.proxy(function (err, html) {
        if (err) {
          console.error(err);
        } else {
          item.addClass('open')
            .removeClass('loading')
            .find('.child-pages')
            .html(html);
          this._resolvePaths(item);
        }
      }, this));
    }

  });
  
  $(document).on('click', '.show-description-link', function (event) {
    event.preventDefault();
    var movie = $(event.target).closest('.movie');
    movie.find('.show-description-link').hide();
    movie.find('.hide-description-link').show();
    
    movie.find('.description').slideDown({
      progress: function () {
        $('.kunta-api-movie-list').masonry();
      },
      complete: function () {
        $('.kunta-api-movie-list').masonry();
      }
    });
    
    
    movie.find('.description').show();
    $('.kunta-api-movie-list').masonry();
  });
  
  $(document).on('click', '.hide-description-link', function (event) {
    event.preventDefault();
    var movie = $(event.target).closest('.movie');
    movie.find('.show-description-link').show();
    movie.find('.hide-description-link').hide();
    
    movie.find('.description').slideUp({
      progress: function () {
        $('.kunta-api-movie-list').masonry();
      },
      complete: function () {
        $('.kunta-api-movie-list').masonry();
      }
    });
  });
  
  $(document).ready(function () {
    $(document.body).contentsNav({
      rootPath: $('.rootPath').val()
    });
    
    $('.kunta-api-movie-list').css('opacity', '0');

    $('.kunta-api-movie-list').imagesLoaded(function () {
      $('<div>')
        .addClass('movie-list-grid-sizer')
        .appendTo($('.kunta-api-movie-list'));
      
      $('.kunta-api-movie-list')
        .css('opacity', '1')
        .masonry({
          itemSelector: '.movie',
          columnWidth: '.movie-list-grid-sizer',
          percentPosition: true,
          transitionDuration: 0
        });
    });
    
    $("img.lazy").lazyload();
  });
  
}).call(this);