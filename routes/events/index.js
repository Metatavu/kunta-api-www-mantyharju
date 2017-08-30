/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';
  
  const _ = require('lodash');
  const util = require('util');
  const moment = require('moment');
  const metaformFields = require('metaform-fields');
  
  function formatDate(date) {
    const momentDate = moment(date);
    const midnight = momentDate.clone().startOf('day');
    
    if (momentDate.diff(midnight) === 0) {
      return momentDate.format("D.M.YYYY");
    }
    
    return util.format('%s klo %s alkaen', moment(date).format('D.M.YYYY'), moment(date).format('H'));
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
    
    app.get(util.format('%s/uusi', Common.EVENTS_FOLDER), (req, res, next) => {
      new ModulesClass(config)
        .events.list(0, 50, 'START_DATE', 'DESCENDING')
        .callback((data) => {
          const latestEvents = data[0];
  
          res.render('pages/event-new', Object.assign(req.kuntaApi.data, {
            viewModel: require(`${__dirname}/forms/create-event`),
            plugins: [ metaformFields.templates() ],
            latestEvents: latestEvents,
            breadcrumbs : [
              { path: Common.EVENTS_FOLDER, title: 'Tapahtumat' }, 
              { path: util.format('%s/uusi', Common.EVENTS_FOLDER), title: 'Uusi' }
            ]
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
        
      new ModulesClass(config)
        .events.find(id)
        .events.list(0, 50, 'START_DATE', 'DESCENDING')
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
    
    app.get('/linkedevents/places/search', (req, res, next) => {
      const text = req.query.q;
      const page = req.query.page || 1;
      const pageSize = Common.LINKEDEVENTS_MAX_PLACES;
      
      new ModulesClass(config)
        .linkedevents.searchPlaces(text, page, pageSize)
        .callback((data) => {
          const places = data[0].data||[];
          res.send(_.map(places, (place) => {
            return {
              value: place.id,
              label: place.name ? place.name.fi : ''
            };
          }));
        });
    });
    
    app.get('/linkedevents/keywords/search', (req, res, next) => {
      const text = req.query.text;
      const page = req.query.page || 1;
      const pageSize = Common.LINKEDEVENTS_MAX_PLACES;
      
      new ModulesClass(config)
        .linkedevents.searchKeywords(text, page, pageSize)
        .callback((data) => {
          const keywords = data[0].data||[];
          res.send(_.map(keywords, (keyword) => {
            return {
              value: keyword.id,
              label: keyword.name ? keyword.name.fi : ''
            };
          }));
        });
    });
    
    app.post('/linkedevents/event/create', (req, res, next) => {
      const linkedEventsURL = config.get('linkedevents:api-url');
      
      const keywords = _.map(req.body['keywords'].split(','), (keyword) => {
        return {
          "@id": `${linkedEventsURL}/keyword/${keyword}/`
        };
      });
      
      const location = {
        "@id": `${linkedEventsURL}/place/${req.body['place']}/`
      };
      
      const image = [];
    
      if (req.body['image']) {
        image.push({
          "@id": `${linkedEventsURL}/image/${req.body['image']}/`
        });
      }
      
      const eventData = {
        "publication_status": "public",
        "name": {
          "fi": req.body['name-fi'],
          "sv": req.body['name-sv'],
          "en": req.body['name-en']
        },
        "description": {
          "fi": req.body['description-fi'],
          "sv": req.body['description-sv'],
          "en": req.body['description-en']
        },
        "short_description": {
          "fi": req.body['short-description-fi'],
          "sv": req.body['short-description-sv'],
          "en": req.body['short-description-en']
        },
        "place": req.body['place'],
        "image": image,
        "keywords": keywords,
        "location": location,
        "offers": [{
          is_free: true,
          price: null,
          info_url: null,
          description: null
        }]
      };
      
      if (req.body['start']) {
        eventData["start_time"] = req.body['start'];
      }
      
      if (req.body['end']) {
        eventData["end_time"] = req.body['end'];
      }
      
      new ModulesClass(config)
        .linkedevents.createEvent(eventData)
        .callback((data) => {
          res.send(200);
        }, (err) => {
          res.status(err.response.status).send(err.response.text);
        });
    });
    
  };

}).call(this);