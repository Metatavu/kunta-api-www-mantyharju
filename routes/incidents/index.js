/*jshint esversion: 6 */
(() => {
  'use strict';
  
  const _ = require('lodash');
  
  module.exports = (app, config, ModulesClass) => {
    
    app.get('/incidents', (req, res, next) => {
      const area = req.query.area;
      
      new ModulesClass(config)
        .incidents.list(new Date())
        .callback((result) => {
          let incidents = result[0];
          
          if (result && result.length) {
            if (area) {
              incidents = _.filter(incidents||[], (incident) => {
                return _.includes((incident.areas||[]), area);
              });
            }
            
            res.send(incidents);
          } else {
            next({
              status: 404
            });
          }
        });
    });
    
  };

})();