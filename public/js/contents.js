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
  
  $(document).ready(function () {
    $(document.body).contentsNav({
      rootPath: $('.rootPath').val()
    });
    
    $("img.lazy").lazyload();
  });
  
}).call(this);