/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';
  
  var path = require('path');
  var routes = require('./routes');
  
  module.exports = function() {
    
    return {
      'views': path.join(__dirname, 'views'),
      'static': path.join(__dirname, 'public'),
      'routes': routes
    };
    
  };
  
}).call(this);