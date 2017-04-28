/*jshint esversion: 6 */
(function() {
  'use strict';
  
  module.exports = (app, config, ModulesClass) => {

    app.get('/eventImages/:eventId/:imageId', (req, res, next) => {
      var eventId = req.params.eventId;
      var imageId = req.params.imageId;
      
      if (!eventId || !imageId) {
        next({
          status: 404
        });
        
        return;
      }
      
      new ModulesClass(config)
        .events.streamImageData(eventId, imageId, req.query, req.headers)
        .callback((result) => {
          var stream = result[0];
          
          if (stream) {
            stream.pipe(res);
          } else {
            next({
              status: 500,
              message: "Kuvan lataus epäonnistui"
            });
          }
        });
    });
    
  };

}).call(this);