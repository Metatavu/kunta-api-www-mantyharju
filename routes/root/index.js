/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const cheerio = require('cheerio');
  const _ = require('lodash');
  const $ = require('cheerio');
  const Common = require(__dirname + '/../common');
  
  function formatEventStart(date) {
    const momentDate = moment(date);
    const midnight = momentDate.clone().startOf('day');
    
    if (momentDate.diff(midnight) === 0) {
      return momentDate.format("D.M.YYYY");
    }
    
    return util.format('%s KLO %s ALK.', moment(date).format('D.M.YYYY'), moment(date).format('H'));
  }

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/', (req, res, next) => {
      new ModulesClass(config)
        .news.latest(0, 5)
        .banners.list()
        .announcements.list(Common.ANNOUNCEMENT_COUNT, 'PUBLICATION_DATE', 'DESCENDING')
        .events.latest(Common.EVENT_COUNT, 'START_DATE', 'DESCENDING')
        .pages.getContent(Common.MOVIES_PAGE_ID)
        .callback(function(data) {
          const path = req.path.substring(9);
          const activeMovies = Common.parseActiveMovies(Common.processPageContent(path, data[4]));
          const news = _.clone(data[0]).map(newsArticle => {
            return Object.assign(newsArticle, {
              "shortAbstract": _.truncate($.load(newsArticle.abstract).text(), {
                'length': 160
              }),
              "shortDate": moment(newsArticle.published).format("D.M.YYYY"),
              "imageSrc": newsArticle.imageId ? util.format('/newsArticleImages/%s/%s', newsArticle.id, newsArticle.imageId) : null
            });
          });
          
          const movieBanner = data[1].filter((banner) => {
            return banner.title === "elokuva-banneri";
          });
          
          const bannersWithoutMovies = data[1].filter((banner) => {
            return banner.title !== "elokuva-banneri";
          });

          var banners = _.clone(bannersWithoutMovies || []).map(banner => {
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
              "startHumanReadable": formatEventStart(event.start)
            });
          });
          
          const movieImageUrls = _.uniq(activeMovies.map((movie) => {
            return movie.imageUrl;
          }));
          
          if (movieImageUrls.length < 1) {
            movieImageUrls.push('/gfx/layout/default_movie_banner.jpg');
          }
          
          res.render('pages/index.pug', Object.assign(req.kuntaApi.data, {
            banners: banners,
            announcements: announcements,
            news: news,
            events: events,
            movieImageUrls: movieImageUrls.filter(Boolean),
            movieBanner: movieBanner[0] ? movieBanner[0] : null
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