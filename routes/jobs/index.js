/*jshint esversion: 6 */
(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/jobs/:limit/:sortBy/:sortDir', (req, res) => {
      const limit = parseInt(req.params.limit);
      const sortby = req.params.sortBy;
      const sortDir = req.params.sortDir;
      
      new ModulesClass(config)
        .jobs.list(limit, sortby, sortDir)
        .callback((data) => {
          res.json(data);
        }, (err) => {
          console.error(err);
          res.status(500).send(err);
        });
      });
  };

}).call(this);