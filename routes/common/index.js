/*jshint esversion: 6 */
(function() {
  'use strict';

  const util = require('util');
  const _ = require('lodash');
  const cheerio = require('cheerio');
  
  class Common {
    
    static get CONTENT_FOLDER() { 
      return '/sisalto';
    }
    
    static get PAGE_IMAGES_FOLDER() { 
      return '/pageImages';
    }
    
    static get SOCIAL_MEDIA_POSTS() { 
      return 3 * 3;
    }

    static get EVENT_COUNT() { 
      return 5;
    }
 
    static get FILES_FOLDER() { 
      return '/tiedostot';
    }
    
    static get NEWS_FOLDER() { 
      return '/uutiset';
    }
    
    static get NEWS_COUNT_PAGE() { 
      return 10;
    }
    
    static get ANNOUNCEMENTS_FOLDER() { 
      return '/kuulutukset';
    }
    
    static get EVENTS_FOLDER() { 
      return '/tapahtumat';
    }
    
    static get ANNOUNCEMENT_COUNT() { 
      return 5;
    }

    static get ANNOUNCEMENT_COUNT_PAGE() { 
      return 10;
    }
    
    static get SEARCH_RESULTS_PER_TYPE() {
      return 5;
    }
    
    static get EVENTS_COUNT_PAGE() {
      return 5;
    }
    
    static resolveLinkType(link) {
      if (!link || link.startsWith('#')) {
        return 'NONE';
      }

      if (link.startsWith('/')) {
        return 'PATH';
      } else if (link.match(/[a-zA-Z]*:\/\/.*/)) {
        return 'ABSOLUTE';
      }

      return 'RELATIVE';
    }
    
    static processLink(currentPage, text) {
      if (!text) {
        return null;
      }

      var link = text.trim();
      if (!link) {
        return null;
      }

      switch (Common.resolveLinkType(link)) {
        case 'PATH':
          return util.format('%s%s', Common.CONTENT_FOLDER, link);
        case 'RELATIVE':
          return util.format('%s/%s', currentPage.split('/').splice(-1), link);
        default:
      }

      return link;
    }

    static processPageContent(currentPage, content) {
      if (!content) {
        return '';
      }

      const $ = cheerio.load(content);

      $('table').addClass('table table-responsive');

      $('a[href]').each((index, link) => {
        var href = $(link).attr('href');
        $(link).attr('href', Common.processLink(currentPage, href));
      });

      $('.kunta-api-image[data-image-type="content-image"]').each((index, img) => {
        const pageId = $(img).attr('data-page-id');
        const imageId = $(img).attr('data-attachment-id');
        const width = parseInt($(img).attr('width'));
        const height = parseInt($(img).attr('height'));
        const size = width && height ? Math.min(width, height) : width || height || null;
        const src = util.format('/pageImages/%s/%s%s', pageId, imageId, size ? util.format('?size=%s', size) : '');
        
        $(img)
          .removeAttr('data-page-id')
          .removeAttr('data-attachment-id')
          .removeAttr('data-organization-id')
          .removeAttr('data-image-type')
          .attr('src', src);
      });

      $('img[src]').each((index, img) => {
        var src = $(img).attr('src');
        $(img)
          .addClass('lazy')
          .removeAttr('src')
          .removeAttr('srcset')
          .attr('data-original', src);
      });
      
      $('aside').remove();

      return $.html();
    }

    static getSidebarContent(content) {
      if (!content) {
        return '';
      }
      
      const $ = cheerio.load(content);
      
      $('aside').find('*[contenteditable]').removeAttr('contenteditable');

      $('aside').find('img')
        .removeAttr('srcset')
        .removeAttr('width')
        .removeAttr('sizes')
        .removeAttr('class')
        .removeAttr('height');

      return $('aside').html();
    }
    
    static plainTextParagraphs(text) {
      var result = [];
      var paragraphs = (text||'').split('\n');
      
      for (var i = 0; i < paragraphs.length; i++) {
        result.push(util.format('<p>%s</p>', paragraphs[i]));
      }
      
      return result.join('');
    }
  }

  module.exports = Common;

}).call(this);