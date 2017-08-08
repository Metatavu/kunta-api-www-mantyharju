/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const _ = require('lodash');
  const cheerio = require('cheerio');
  const moment = require('moment');
  const pug = require('pug');
  const Common = require(__dirname + '/../common');
  
  module.exports = (app, config, ModulesClass) => {

    function loadChildPages(pages, preferLanguages, callback) {
      var module = new ModulesClass(config);
      
      pages.forEach((page) => {
        if (!page.meta || !page.meta.hideMenuChildren) {
          module.pages.listMetaByParentId(page.id, preferLanguages);
        }
      });
      
      module.callback(function (data) {
        var index = 0;
        pages.forEach((page) => {
          if (!page.meta || !page.meta.hideMenuChildren) {
            pages[index].hasChildren = data[index] && data[index].length > 0;
            index++;
          }
        });
        
        callback(pages);
      });
    }
    
    function mapOpenChildren(children, activeIds, openTreeNodes) {
      if (openTreeNodes.length > 0) {
        for (var i = 0; i < children.length; i++) {
          if (activeIds.indexOf(children[i].id) != -1) {
            children[i].children = openTreeNodes.shift();
            mapOpenChildren(children[i].children, activeIds, openTreeNodes);
            break;
          }
        }
      }
      
      return children;
    }
    
    app.get('/ajax/pagenav', (req, res) => {
      var pageId = req.query.pageId;
      var preferLanguages = req.headers['accept-language'];
      
      new ModulesClass(config)
        .pages.listMetaByParentId(pageId, preferLanguages)
        .callback(function(data) {
          loadChildPages(data[0], preferLanguages, (children) => {
            res.render('ajax/pagenav.pug', {
              childPages: children,
              activeIds: []
            });
          });
        });
    });

    app.get('/pageImages/:pageId/:imageId', (req, res, next) => {
      var pageId = req.params.pageId;
      var imageId = req.params.imageId;
      
      if (!pageId || !imageId) {
        next({
          status: 404
        });
        
        return;
      }
      
      new ModulesClass(config)
        .pages.streamImageData(pageId, imageId, req.query, req.headers)
        .callback((result) => {
          var stream = result[0];
          
          if (stream) {
            stream.pipe(res);
          } else {
            next({
              status: 500,
              message: "Kuvan lataus epäonnistui"
            });
          }
        });
    });
    
    app.get(util.format('%s*', Common.CONTENT_FOLDER), (req, res, next) => {
      var path = req.path.substring(9);
      var rootPath = path.split('/')[0];
      var preferLanguages = req.headers['accept-language'];

      new ModulesClass(config)
        .pages.findByPath(path, preferLanguages)
        .pages.findByPath(rootPath, preferLanguages)
        .callback(function(data) {
          var page = data[0];
          var rootPage = data[1];
          if (!page || !rootPage) {
            next({
              status: 404
            });
            return;
          }
          
          new ModulesClass(config)
            .pages.getContent(page.id, preferLanguages)
            .pages.resolveBreadcrumbs(Common.CONTENT_FOLDER, page, preferLanguages)
            .pages.listMetaByParentId(rootPage.id, preferLanguages)
            .pages.readMenuTree(rootPage.id, page.id, preferLanguages)
            .pages.listImages(page.id)
            .callback(function(pageData) {
              let contents = Common.processPageContent(path, pageData[0]);
              let breadcrumbs = pageData[1];
              let rootFolderTitle = rootPage.title;
              let openTreeNodes = pageData[3];
              let images = pageData[4];
              let activeIds = _.map(breadcrumbs, (breadcrumb) => {
                return breadcrumb.id;
              });
              
              let featuredImageId = null;
              let bannerImageId = null;
              (images||[]).forEach((image) => {
                if (image.type === 'featured') {
                  featuredImageId = image.id;
                } else if (image.type === 'banner') {
                  bannerImageId = image.id;
                }
              });
              
              const movieTemplate = pug.compileFile(__dirname + '/../../views/fragments/movie.pug');
              let $ = cheerio.load(contents);
              let movies = $('.kunta-api-movie');
              let isMoviePage = movies.length > 0;
              movies.each((index, movie) => {
                let result = {};
                const simpleAttributes = ['title', 'age-limit', 'runtime', 'price', 'description', 'trailer-url'];
                const jsonAttributes = ['showtimes', 'classifications'];
                
                for (let i = 0; i < simpleAttributes.length; i++) {
                  result[_.camelCase(simpleAttributes[i])] = $(movie).attr(util.format('data-%s', simpleAttributes[i]));
                }
                
                for (let i = 0; i < jsonAttributes.length; i++) {
                  result[_.camelCase(jsonAttributes[i])] = JSON.parse($(movie).attr(util.format('data-%s', jsonAttributes[i])));
                }
                
                let showtimes = _.map(result.showtimes, (showtime) => {
                  return moment(showtime);
                });
                
                showtimes = _.filter(showtimes, (showtime) => {
                  return showtime.isAfter(moment());
                });
                
                result.showtimes = _.map(showtimes, (showtime) => {
                  showtime.locale('fi');
                  return showtime.format('llll');
                });
                
                result['imageUrl'] = $(movie).find('img').attr('data-original');
                
                let rendered = $(movieTemplate(result));
                $(movie).replaceWith(rendered);
              });
              
              let featuredImageSrc = featuredImageId ? util.format('/pageImages/%s/%s', page.id, featuredImageId) : null;
              let bannerSrc = bannerImageId ? util.format('/pageImages/%s/%s', page.id, bannerImageId) : '/gfx/layout/default_banner.jpg';
              
              loadChildPages(pageData[2], preferLanguages, (children) => {
                res.render('pages/contents.pug', Object.assign(req.kuntaApi.data, {
                  id: page.id,
                  slug: page.slug,
                  rootPath: util.format("%s/%s", Common.CONTENT_FOLDER, rootPath),
                  title: page.title,
                  rootFolderTitle: rootFolderTitle,
                  contents: $.html(),
                  sidebarContents: Common.getSidebarContent(contents),
                  breadcrumbs: breadcrumbs,
                  featuredImageSrc: featuredImageSrc,
                  activeIds: activeIds,
                  children: mapOpenChildren(children, activeIds, openTreeNodes),
                  openTreeNodes: openTreeNodes,
                  bannerSrc: bannerSrc,
                  isMoviePage: isMoviePage
                }));
              });

            }, (contentErr) => {
              next({
                status: 500,
                error: contentErr
              });
            });

        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });
    
  };

}).call(this);