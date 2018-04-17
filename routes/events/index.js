/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';
  
  const _ = require('lodash');
  const util = require('util');
  const moment = require('moment-timezone');
  const metaformFields = require('metaform-fields');
  const multer  = require('multer');
  const fs = require('fs');
  const uuidv4 = require('uuid/v4');
  const path = require('path');
  const validator = require('validator');
  const striptags = require("striptags");

  function formatDate(date) {
    const momentDate = moment(date);
    const midnight = momentDate.clone().startOf('day');
    
    if (momentDate.diff(midnight) === 0) {
      return momentDate.format("D.M.YYYY");
    }
    
    return util.format('%s klo %s alkaen', moment(date).format('D.M.YYYY'), moment(date).format('H:mm'));
  }
  
  function truncateDescription(description) {
    return _.truncate(description, {
    "length": 150
   });
  }
  
  module.exports = (app, config, ModulesClass) => {
    
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config.get('uploads:path'));
      },
      filename: (req, file, cb) => {
        let uploadFolder = config.get('uploads:path');
        let fileName = file.originalname;
        let fileCount = 0;
        let filePath = uploadFolder + fileName;
        let nameWithoutExtension = fileName;
        let extension = '';

        if (fileName.lastIndexOf(".") > -1 ){
          nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf("."));
          extension = fileName.substring(fileName.lastIndexOf("."));
        }

        while (fs.existsSync(filePath)) {
          fileCount++;
          fileName = nameWithoutExtension + '_' + fileCount + extension;
          filePath = uploadFolder + fileName;
        }

        cb(null, fileName);
      }
    });

    const upload = multer({
      storage: storage, 
      fileFilter: function (req, file, callback) {
        const ext = path.extname(file.originalname);
        if(ext == '.png' || ext == '.jpg' || ext == '.gif' || ext == '.jpeg') {
          return callback(null, true);
        }

        callback(new Error('Only images are allowed'));
      },
      limits: {
        fileSize: 2097152,
        files: 1
      } 
    });
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
      
      res.render('pages/events-list.pug', Object.assign(req.kuntaApi.data, {
        breadcrumbs : [{path: Common.EVENTS_FOLDER, title: 'Tapahtumat'}]
      }));
    });
    
    app.get('/ajax/events', (req, res, next) => {
      const perPage = Common.EVENTS_COUNT_PAGE;
      const page = parseInt(req.query.page)||0;
      const start = req.query.start ? moment(req.query.start, 'DD.MM.YYYY').startOf('day').format() : null;
      const end = req.query.end ? moment(req.query.end, 'DD.MM.YYYY').endOf('day').format() : null;
      const module = new ModulesClass(config);
        
      module.events.list({ 
        firstResult: page * perPage,
        maxResults: perPage + 1,
        orderBy: 'START_DATE',
        orderDir: 'DESCENDING',
        startBefore: end,
        endAfter: start
      })
      .callback((data) => {
        const lastPage = data[0].length < perPage + 1;
        const events = data[0].splice(0, perPage).map(event => {
          return Object.assign(event, {
            "shortDate": moment(event.start).format("D.M.YYYY"),
            "imageSrc": event.imageId ? util.format('/eventImages/%s/%s', event.id, event.imageId) : '/gfx/layout/tapahtuma_default_120_95.jpg',
            "shortDescription": _.truncate(event.description, {length: 200})
          });
        });

        res.render('ajax/events-list.pug', Object.assign(req.kuntaApi.data, {
          page: page,
          lastPage: lastPage,
          events: events
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
        .events.list({ 
          firstResult: 0,
          maxResults: 50,
          orderBy: 'START_DATE',
          orderDir: 'DESCENDING'
        })
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
        .events.list({ 
          firstResult: 0,
          maxResults: 50,
          orderBy: 'START_DATE',
          orderDir: 'DESCENDING'
        })
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
    
    app.get('/ajax/linkedevents/places/new', (req, res, next) => {
      res.render('ajax/place-new', Object.assign(req.kuntaApi.data, {
        viewModel: require(`${__dirname}/forms/create-place`),
        plugins: [ metaformFields.templates() ]
      }));
    });
    
    app.post('/linkedevents/places/create', (req, res, next) => {
      const placeData = {
        "publication_status": "public",
        "name": {
          "fi": req.body['name-fi'],
          "sv": req.body['name-sv'],
          "en": req.body['name-en']
        }
      };
      
      new ModulesClass(config)
        .linkedevents.createPlace(placeData)
        .callback((data) => {
          res.send(data[0]);
        }, (err) => {
          res.status(err.response.status).send(err.response.text);
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

    app.post('/linkedevents/image', upload.single('file'), (req, res, next) => {
      const deleteKey = uuidv4();
      const deleteKeyFilePath = config.get('uploads:path') + req.file.filename + '.' + deleteKey;
      
      fs.closeSync(fs.openSync(deleteKeyFilePath, 'w'));
      
      res.send([{
        filename: req.file.filename,
        originalname: req.file.filename,
        deleteKey: deleteKey,
        url: config.get('uploads:baseUrl') + req.file.filename
      }]);
    });
    
    app.delete('/linkedevents/image/:filename', (req, res) => {
      const filename = req.params.filename;
      const fileDeleteKey = req.query.c;
      const uploadFolder = config.get('uploads:path') || 'uploads/';
      const keyFilePath = uploadFolder + filename + '.' + fileDeleteKey;
      
      if (fs.existsSync(keyFilePath)) {
        fs.unlinkSync(keyFilePath);
        fs.unlinkSync(uploadFolder + filename);
        res.status(204).send(); 
      } else {
        res.status(401).send();
      }
    });
    
    app.post('/linkedevents/event/create', (req, res, next) => {
      const module = new ModulesClass(config);

      let imageUrls = [];
      if (req.body['image-url']) {
        imageUrls.push(req.body['image-url']);
      }
      
      if (req.body['image']) {
        if (Array.isArray(req.body['image'])) {
          imageUrls = imageUrls.concat(req.body['image']);
        } else {
          imageUrls.push(req.body['image']);
        }
      }
      
      for (let i = 0; i < imageUrls.length; i++) {
        if (!validator.isURL(imageUrls[i])) {
          res.status(400).send('Kuvan osoitteen pitää olla URL-osoite. Mikäli olet lataamassa kuvaa omalta tietokoneeltasi, klikkaa lisää tiedosto - painiketta.');
          return;
        }
      }

      const nameFi = (req.body['name-fi'] || '').trim();
      if (!nameFi) {
        res.status(400).send('Nimi (Suomi) on pakollinen');
        return;
      }
      
      const location = req.body.location;
      if (!location) {
        res.status(400).send('Paikka on pakollinen');
        return;
      }

      module.linkedevents.findPlace(location).callback((linkedEventsLocation) => {
        if (!linkedEventsLocation) {
          res.status(400).send('Tapahtumapaikka on virheellinen. Ole hyvä ja valitse tapahtumapaikka listasta.');
          return;
        }

        const eventData = {
          "publication_status": "draft",
          "name": {
            "fi": nameFi,
            "sv": req.body['name-sv'],
            "en": req.body['name-en']
          },
          "description": {
            "fi": req.body['description-fi'],
            "sv": req.body['description-sv'],
            "en": req.body['description-en']
          },
          "short_description": {
            "fi": truncateDescription(req.body['description-fi']),
            "sv": truncateDescription(req.body['description-sv']),
            "en": truncateDescription(req.body['description-en'])
          },
          "provider": {
            "fi": req.body['provider']
          },
          "image-urls": imageUrls,
          "keywords": [Common.DEFAULT_EVENT_KEYWORD_ID],
          "location": location,
          "offers": [{
            is_free: true,
            price: null,
            info_url: null,
            description: null
          }]
        };
        
        const startDate = req.body['start-date'];
        const startTime = req.body['start-time'];
        const endDate = req.body['end-date'];
        const endTime = req.body['end-time'];
        const timezone = 'Europe/Helsinki';
        
        if (!startDate) {
          res.status(400).send('Alkamispäivämäärä on pakollinen');
          return;
        }
        
        if (!endDate) {
          res.status(400).send('Loppumispäivämäärä on pakollinen');
          return;
        }
        
        const eventStart = startTime ? moment.tz(`${startDate}T${startTime}`,  moment.ISO_8601, 'Europe/Helsinki') : moment(startDate, moment.ISO_8601);
        if (!eventStart.isValid()) {
          res.status(400).send('Alkamispäivämäärä tai aika on virheellisen muotoinen. Ole hyvä ja käytä muotoa VVVV-MM-DD (esim. 2019-12-24) ja muotoa HH:MM (esim 10:30)');
          return;
        }
        
        const eventEnd = endTime ? moment.tz(`${endDate}T${endTime}`,  moment.ISO_8601, 'Europe/Helsinki') : moment(endDate, moment.ISO_8601);
        if (!eventEnd.isValid()) {
          res.status(400).send('Loppumispäivämäärä tai aika on virheellisen muotoinen. Ole hyvä ja käytä muotoa VVVV-MM-DD (esim. 2019-12-24) ja muotoa HH:MM (esim 10:30)');
          return;
        }

        if (eventStart.isAfter(eventEnd)) {
          res.status(400).send('Alkamisaika ei voi olla loppumisajan jälkeen');
          return;
        }
        
        eventData["start_time"] = eventStart.format();
        eventData["has_start_time"] = !!startTime;
        
        eventData["end_time"] = eventEnd.format();
        eventData["has_end_time"] = !!endTime;

        module.linkedevents.createEvent(eventData)
          .callback((data) => {
            res.send(200);
          }, (err) => {
            res.status(err.response.status).send(err.response.text);
          });
      }, (err) => {
        res.status(400).send('Tapahtumapaikka on virheellinen. Ole hyvä ja valitse tapahtumapaikka listasta.');
        return;
      });
    });
    
  };

}).call(this);