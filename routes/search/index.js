/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {

    app.get('/ajax/search', (req, res) => {
      const search = Common.processFreeTextSearch(req.query.search);
      const preferLanguages = req.headers['accept-language'];
      
      new ModulesClass(config)
        .pages.search(search, preferLanguages, 0, Common.SEARCH_RESULTS_PER_TYPE)
        .files.search(search, 0, Common.SEARCH_RESULTS_PER_TYPE)
        .news.search(search, 0, Common.SEARCH_RESULTS_PER_TYPE)
        .callback((data) => {
          const pages = data[0];
          const files = data[1];
          const newsArticles = data[2];
          
          res.render('ajax/search.pug', {
            pages: pages,
            files: files,
            newsArticles: newsArticles
          });
        });
    });
    
  };

}).call(this);