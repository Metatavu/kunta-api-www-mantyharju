/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  module.exports = function(app, config, ModulesClass) {
    
    // Register common data middleware
    
    require(__dirname + '/common-data')(app, config, ModulesClass);
    
    // Register routes

    require(__dirname + '/root')(app, config, ModulesClass);
    require(__dirname + '/banners')(app, config, ModulesClass);
    require(__dirname + '/news')(app, config, ModulesClass);
    require(__dirname + '/pages')(app, config, ModulesClass);
    require(__dirname + '/search')(app, config, ModulesClass);
    require(__dirname + '/redirect')(app, config, ModulesClass);
    /*require(__dirname + '/shortlinks')(app, config, ModulesClass);
    require(__dirname + '/banners')(app, config, ModulesClass);
    require(__dirname + '/events')(app, config, ModulesClass);
    require(__dirname + '/pages')(app, config, ModulesClass);
    require(__dirname + '/files')(app, config, ModulesClass);
    require(__dirname + '/tiles')(app, config, ModulesClass);
    require(__dirname + '/publictransport')(app, config, ModulesClass);
    require(__dirname + '/jobs')(app, config, ModulesClass);
    require(__dirname + '/announcements')(app, config, ModulesClass);
    require(__dirname + '/news')(app, config, ModulesClass);
    require(__dirname + '/search')(app, config, ModulesClass);
    require(__dirname + '/redirect')(app, config, ModulesClass);*/
    // Register error routes. Keep these as last to ensure catch all functionality
    
    require(__dirname + '/error')(app, config, ModulesClass);
  };

}).call(this);