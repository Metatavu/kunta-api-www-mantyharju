/*jshint esversion: 6 */
(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/jobs', (req, res) => {
      const limit = parseInt(req.query.limit);
      const sortby = req.query.sortBy;
      const sortDir = req.query.sortDir;
      
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