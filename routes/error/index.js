/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const Common = require(__dirname + '/../common');
  
  function renderErrorPage(req, res, status, message, error) {
    var page;
    
    switch (status) {
      case 404:
        page = status;
      break;
      default:
        page = 500;
      break;
    }
    
    if (error) {
      console.error(error);
    }
    
    if (message) {
      console.error(message);
    }
    
    var bannerSrc = '/gfx/layout/default_banner.jpg';
    
    res.status(status);
    res.render(util.format('error/%d', page), Object.assign(req.kuntaApi.data, {
      bannerSrc: bannerSrc,
      error: error,
      message: message
    }));
  }

  module.exports = (app, config, ModulesClass) => {

    app.use((data, req, res, next) => {
      renderErrorPage(req, res, data.status || 500, data.message, data.error);
    });
    
    app.use((req, res, next) => {
      // Catch all for unhandled routes
      renderErrorPage(req, res, 404);      
    });
    
  };

}).call(this);