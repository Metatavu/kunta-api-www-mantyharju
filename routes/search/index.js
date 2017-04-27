/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {

    app.get('/ajax/search', (req, res) => {
      var search = req.query.search;
      var preferLanguages = req.headers['accept-language'];
      
      new ModulesClass(config)
        .pages.search(search, preferLanguages, Common.SEARCH_RESULTS_PER_TYPE)
        .files.search(search, Common.SEARCH_RESULTS_PER_TYPE)
        .callback(function(data) {
          var pages = data[0];
          var files = data[1];
          
          res.render('ajax/search.pug', {
            pages: pages,
            files: files
          });
        });
    });
    
  };

}).call(this);