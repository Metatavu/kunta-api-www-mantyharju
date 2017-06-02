/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/', (req, res, next) => {
      new ModulesClass(config)
        .news.latest(0, 5)
        .banners.list()
        .announcements.list(Common.ANNOUNCEMENT_COUNT, 'PUBLICATION_DATE', 'DESCENDING')
        .events.latest(Common.EVENT_COUNT, 'START_DATE', 'DESCENDING')
        .callback(function(data) {

          var news = _.clone(data[0]).map(newsArticle => {
            return Object.assign(newsArticle, {
              "shortDate": moment(newsArticle.published).format("D.M.YYYY"),
              "imageSrc": newsArticle.imageId ? util.format('/newsArticleImages/%s/%s', newsArticle.id, newsArticle.imageId) : null
            });
          });

          var banners = _.clone(data[1] || []).map(banner => {
            var styles = [];
            
            if (banner.textColor) {
              styles.push(util.format('color: %s', banner.textColor));
            }

            if (banner.backgroundColor) {
              styles.push(util.format('background-color: %s', banner.backgroundColor));
            }
            
            return Object.assign(banner, {
              imageSrc: banner.imageId ? util.format('/bannerImages/%s/%s', banner.id, banner.imageId) : '/gfx/layout/default_banner.jpg',
              bgcolor: banner.backgroundColor ? banner.backgroundColor : 'rgba(255, 255, 255, 0.3)'
            });
          });
          
          var announcements = _.clone(data[2] || []).map(announcement => {
            return Object.assign(announcement, {
              "shortDate": moment(announcement.published).format("D.M.YYYY")
            });
          });
          
          var events = _.clone(data[3] || []).map(event => {
            return Object.assign(event, {
              "imageSrc": event.imageId ? util.format('/eventImages/%s/%s', event.id, event.imageId) : '/gfx/layout/tapahtuma_default_625x350.jpg',
              "shortDate": moment(event.start).format('D.M.YYYY'),
              "startHumanReadable": util.format('%s KLO %s ALK.', moment(event.start).format('D.M.YYYY'), moment(event.start).format('H'))
            });
          });
          
          res.render('pages/index.pug', Object.assign(req.kuntaApi.data, {
            banners: banners,
            announcements: announcements,
            news: news,
            events: events
          }));

        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });
  };

}).call(this);