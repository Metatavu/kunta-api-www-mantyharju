/*jshint esversion: 6 */
(function() {
  'use strict';
  
  const _ = require('lodash');
  const util = require('util');
  const moment = require('moment');
  
  function formatDate(date) {
    const momentDate = moment(date);
    const midnight = momentDate.startOf('day');
    
    if (momentDate.diff(midnight) === 0) {
      return momentDate.format("D.M.YYYY");
    }
      
    return momentDate.format("D.M.YYYY hh:mm");
  }
  
  module.exports = (app, config, ModulesClass) => {
    const Common = require(__dirname + '/../common');

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

    app.get(Common.EVENTS_FOLDER, (req, res, next) => {
      const perPage = Common.EVENTS_COUNT_PAGE;
      const page = parseInt(req.query.page)||0;
      const module = new ModulesClass(config);
        
      module.events.list(page * perPage, perPage + 1, 'START_DATE', 'DESCENDING')
        .callback((data) => {
          const lastPage = data[0].length < perPage + 1;
          const events = data[0].splice(0, perPage).map(event => {
            return Object.assign(event, {
              "shortDate": moment(event.start).format("D.M.YYYY"),
              "imageSrc": event.imageId ? util.format('/eventImages/%s/%s', event.id, event.imageId) : '/gfx/layout/tapahtuma_default_120_95.jpg',
              "shortDescription": _.truncate(event.description, {length: 200})
            });
          });
          
          const bannerSrc = '/gfx/layout/mikkeli-page-banner-default.jpg';
         
          res.render('pages/events-list.pug', Object.assign(req.kuntaApi.data, {
            page: page,
            lastPage: lastPage,
            events: events,
            bannerSrc: bannerSrc,
            breadcrumbs : [{path: Common.EVENTS_FOLDER, title: 'Tapahtumat'}]
          }));
        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });

    app.get(util.format('%s/:id', Common.EVENTS_FOLDER), (req, res, next) => {
      const id = req.params.id;
      const module = new ModulesClass(config);
        
      module.events.find(id)
      module.events.list(0, 50, 'START_DATE', 'DESCENDING')
        .callback((data) => {
          const event = data[0];
          const latestEvents = data[1];
          
          res.render('pages/event.pug', Object.assign(req.kuntaApi.data, {
            event: Object.assign(event, {
              "start": formatDate(event.start),
              "imageSrc": event.imageId ? util.format('/eventImages/%s/%s', event.id, event.imageId) : null
            }),
            latestEvents: latestEvents,
            breadcrumbs : [
              {path: Common.EVENTS_FOLDER, title: 'Tapahtumat'}, 
              {path: util.format('%s/%s', Common.EVENTS_FOLDER, id), title: event.name }
            ]
          }));
        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });
    
  };

}).call(this);