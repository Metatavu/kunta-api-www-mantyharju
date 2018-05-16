/*jshint esversion: 6 */
(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const Common = require(__dirname + '/../common');

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/jobs', (req, res) => {
      const limit = parseInt(req.query.limit) || 5;
      const sortby = req.query.sortBy || 'PUBLICATION_END';
      const sortDir = req.query.sortDir || 'DESCENDING';
      
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