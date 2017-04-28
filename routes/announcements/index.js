/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {

    app.get(util.format('%s/:slug', Common.ANNOUNCEMENTS_FOLDER), (req, res, next) => {
      var slug = req.params.slug;

      if (!slug) {
        next({
          status: 404
        });
        return;
      }
      
      new ModulesClass(config)
        .announcements.list(Common.ANNOUNCEMENT_COUNT_PAGE, 'PUBLICATION_DATE', 'DESCENDING')
        .announcements.findBySlug(slug)
        .callback(function(data) {
          var announcement = data[1];
          var siblings = data[0];
          if (!announcement) {
            next({
              status: 404
            });
            return;
          }

           res.render('pages/announcement.pug', Object.assign(req.kuntaApi.data, {
            id: announcement.id,
            slug: announcement.slug,
            title: announcement.title,
            contents: Common.processPageContent('/', announcement.contents),
            sidebarContents: Common.getSidebarContent(announcement.contents),
            siblings: siblings,
            breadcrumbs : [{path: util.format('%s/%s', Common.ANNOUNCEMENTS_FOLDER, announcement.slug), title: announcement.title }]
          }));

        }, function(err) {
          next({
            status: 500,
            error: err
          });
        });
    });
  };

}).call(this);