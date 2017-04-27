/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const _ = require('lodash');
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
              var contents = pageData[0];
              var breadcrumbs = pageData[1];
              var rootFolderTitle = rootPage.title;
              var openTreeNodes = pageData[3];
              var images = pageData[4];
              var activeIds = _.map(breadcrumbs, (breadcrumb) => {
                return breadcrumb.id;
              });
              
              var featuredImageId = null;
              var bannerImageId = null;
              (images||[]).forEach((image) => {
                if (image.type === 'featured') {
                  featuredImageId = image.id;
                } else if (image.type === 'banner') {
                  bannerImageId = image.id;
                }
              });
              
              var featuredImageSrc = featuredImageId ? util.format('/pageImages/%s/%s', page.id, featuredImageId) : null;
              var bannerSrc = bannerImageId ? util.format('/pageImages/%s/%s', page.id, bannerImageId) : '/gfx/layout/default_banner.jpg';
              
              loadChildPages(pageData[2], preferLanguages, (children) => {
                res.render('pages/contents.pug', Object.assign(req.kuntaApi.data, {
                  id: page.id,
                  slug: page.slug,
                  rootPath: util.format("%s/%s", Common.CONTENT_FOLDER, rootPath),
                  title: page.title,
                  rootFolderTitle: rootFolderTitle,
                  contents: Common.processPageContent(path, contents),
                  sidebarContents: Common.getSidebarContent(contents),
                  breadcrumbs: breadcrumbs,
                  featuredImageSrc: featuredImageSrc,
                  activeIds: activeIds,
                  children: mapOpenChildren(children, activeIds, openTreeNodes),
                  openTreeNodes: openTreeNodes,
                  bannerSrc: bannerSrc
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