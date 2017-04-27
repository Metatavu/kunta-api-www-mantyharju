/*jshint esversion: 6 */
(function() {
  'use strict';
  
  module.exports = (app, config, ModulesClass) => {

    app.get('/bannerImages/:bannerId/:imageId', (req, res, next) => {
      var bannerId = req.params.bannerId;
      var imageId = req.params.imageId;
      
      if (!bannerId || !imageId) {
        next({
          status: 404
        });
        
        return;
      }
      
      new ModulesClass(config)
        .banners.streamImageData(bannerId, imageId, req.query, req.headers)
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