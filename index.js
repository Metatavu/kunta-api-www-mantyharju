/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';
  
  const path = require('path');
  const routes = require('./routes');
  const metaformFields = require('metaform-fields');
  
  module.exports = function() {
    
    return {
      'views': path.join(__dirname, 'views'),
      'static': [ path.join(__dirname, 'public'),  metaformFields.public() ],
      'routes': routes
    };
    
  };
  
}).call(this);