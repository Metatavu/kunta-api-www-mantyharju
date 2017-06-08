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
              imageSrc: tile.imageId ? util.format('/tileImages/%s/%s', tile.id, tile.imageId) : '/gfx/layout/tile-default.jpg'
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
          
          var tileMap = {};
          tiles.forEach((tile) => {
            console.log(tile);
            tileMap[tile.title] = tile;
          });

          req.kuntaApi = {
            data: {
              menus: menus,
              fragmentMap: fragmentMap,
              tileMap: tileMap
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