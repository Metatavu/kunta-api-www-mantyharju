/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const _ = require('lodash');
  const Common = require(__dirname + '/../common');
  const util = require('util');

  module.exports = (app, config, ModulesClass) => {

    app.use(function(req, res, next) {
      var modules = new ModulesClass(config);

      modules
        .menus.list()
        .fragments.list()
        .tiles.list()
        .callback(function(data) {
          var menus = data[0];
          var fragments = data[1];
          var tiles = _.clone(data[2] || []).map(tile => {
            return Object.assign(tile, {
              imageSrc: tile.imageId ? util.format('/tileImages/%s/%s', tile.id, tile.imageId) : null
            });
          });
          
          _.keys(menus).forEach(menuKey => {
            var menu = menus[menuKey];

            menu.items = menu.items.map(item => {
              if (item.url) {
                item.url = Common.processLink(null, item.url);
              }

              return item;
            });
          });
          
          var fragmentMap = {};
          fragments.forEach((fragment) => {
            fragmentMap[fragment.slug] = fragment.contents;
          });

          const googleAnalytics = config.get('googleAnalytics:code');
          
          var tileMap = {};
          tiles.forEach((tile) => {
            tileMap[tile.title] = tile;
          });

          const incidentUrls = [];
          const incidentsConfig = config.get('incidents:urls');
          const incidentsPollInterval = config.get('incidents:pollInterval') || 30000;
          const incidentScriptVersion = config.get('incidents:scriptVersion');
          
          if (Array.isArray(incidentsConfig)) {
            for (let i = 0; i < incidentsConfig.length; i++) {
              let incidentUrl = incidentsConfig[i].url;
              if (incidentsConfig[i].area) {
                incidentUrl += util.format('?area=%s', encodeURIComponent(incidentsConfig[i].area));
              }
              incidentUrls.push(incidentUrl);
            }
          }

          req.kuntaApi = {
            data: {
              cookies: config.get('cookies'),
              menus: menus,
              fragmentMap: fragmentMap,
              googleAnalytics: googleAnalytics,
              tileMap: tileMap,
              incidentUrls: incidentUrls.join(','),
              incidentsPollInterval: incidentsPollInterval,
              incidentScriptVersion: incidentScriptVersion
            }
          };

          next();
        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });
    
  };

}).call(this);