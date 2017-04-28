/*jshint esversion: 6 */
(function() {
  'use strict';
  
  module.exports = (app, config, ModulesClass) => {

    app.get('/tileImages/:tileId/:imageId', (req, res, next) => {
      var tileId = req.params.tileId;
      var imageId = req.params.imageId;
      
      if (!tileId || !imageId) {
        next({
          status: 404
        });
        
        return;
      }
      
      new ModulesClass(config)
        .tiles.streamImageData(tileId, imageId, req.query, req.headers)
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