/*jshint esversion: 6 */
/* global __dirname */

(function () {
  "use strict";

  const _ = require("lodash");
  const util = require("util");
  const moment = require("moment-timezone");
  const metaformFields = require("metaform-fields");
  const multer = require("multer");
  const fs = require("fs");
  const uuidv4 = require("uuid/v4");
  const path = require("path");
  const validator = require("validator");
  const striptags = require("striptags");
  const Entities = require("html-entities").AllHtmlEntities;
  const entities = new Entities();
  const Common = require(`${__dirname}/../common`);
  const Autolinker = require("autolinker");
  const LinkedEventsClient = require("linkedevents-client");

  function hasTime(date) {
    const momentDate = moment(date);
    const midnight = momentDate.clone().startOf("day");
    return momentDate.diff(midnight) > 0;
  }

  function isSameDay(start, end) {
    const startMoment = moment(start);
    const endMoment = moment(end);

    return startMoment.isSame(endMoment, "day");
  }

  function formatDatePart(date) {
    if (hasTime(date)) {
      return moment(date).format("D.M.YYYY HH:mm");
    }

    return moment(date).format("D.M.YYYY");
  }

  function formatDate(start, end) {
    if (!end && !hasTime(start)) {
      return moment(start).format("D.M.YYYY");
    } else if (!end && hasTime(start)) {
      const startMoment = moment(start);
      return `${startMoment.format("D.M.YYYY")} klo ${startMoment.format("H:mm")} alkaen`;
    } else if (isSameDay(start, end) && !hasTime(start)) {
      return moment(start).format("D.M.YYYY");
    } else if (moment(start).isSame(moment(end))) {
      return formatDatePart(start);
    } else if (isSameDay(start, end)) {
      const startMoment = moment(start);
      const endMoment = moment(end);
      return `${startMoment.format("D.M.YYYY")} klo ${startMoment.format("H:mm")} - ${endMoment.format("H:mm")}`;
    } else {
      return `${formatDatePart(start)} - ${formatDatePart(end)}`;
    }
  }

  function truncateDescription(description) {
    return _.truncate(description, {
      "length": 150
    });
  }

  module.exports = (app, config, ModulesClass) => {

    /**
     * Returns events API instance
     * 
     * @returns {LinkedEventsClient.EventApi} events API instance
     */
    function getLinkedEventsEventsApi() {
      const apiUrl = config.get("linkedevents:api-url");
      const apiKey = config.get("linkedevents:api-key");

      const client = LinkedEventsClient.ApiClient.instance;
      client.basePath = apiUrl;
      client.defaultHeaders = {
        apikey: apiKey
      };
      return new LinkedEventsClient.EventApi();
    }

    /**
     * Returns filter API instance
     * 
     * @returns {LinkedEventsClient.FilterApi} filter API instance
     */
    function getLinkedEventsFilterApi() {
      const apiUrl = config.get("linkedevents:api-url");
      const apiKey = config.get("linkedevents:api-key");

      const client = LinkedEventsClient.ApiClient.instance;

      client.basePath = apiUrl;
      client.defaultHeaders = {
        apikey: apiKey
      };

      return new LinkedEventsClient.FilterApi();
    }

    /**
     * Translates LinkedEvents event into format expected by the pug templates
     * 
     * @param {any} event LinkedEvents event
     * @param {string} defaultImage default image 
     * @returns {any} translated event
     */
    function translateEvent(event, defaultImage) {
      const shortDescription = (event.short_description ? event.short_description.fi : "") || "";
      const description = (event.description ? event.description.fi : "") || "";
      const name = (event.name ? event.name.fi : "") || "";
      const imageUrl = event.images && event.images.length ? event.images[0].url : null;
      const start = formatDate(event.start_time, event.end_time);

      return {
        "id": event.id,
        "name": name,
        "start": start,
        "shortDate": moment(event.start_time).format("D.M.YYYY"),
        "imageSrc": imageUrl || defaultImage,
        "description": Common.plainTextParagraphs(Autolinker.link(description)),
        "shortDescription": _.truncate(shortDescription, { length: 200 })
      };
    }

    /**
     * Lists events from LinkedEvents API
     * 
     * @param {number} perPage events per page
     * @param {number} page page number (1 based)
     * @param {moment} start start date
     * @param {moment} end end date
     * @param {string} defaultImage default image
     * @returns {Promise} promise for events 
     */
    async function listEvents(perPage, page, start, end, defaultImage) {
      const eventsApi = getLinkedEventsEventsApi();

      const listOptions = {
        "sort": "end_time",
        "page": page,
        "pageSize": perPage
      };

      if (start) {
        listOptions["start"] = start.toDate();
      }

      if (end) {
        listOptions["end"] = end.toDate();
      }

      const events = (await eventsApi.eventList(listOptions)).data;

      return events.map((event) => translateEvent(event, defaultImage));
    }

    /**
     * Finds event from LinkedEvents API
     * 
     * @param {string} id event id
     * @param {string} defaultImage default image
     * @returns {Promise} promise for event 
     */
    async function findEvent(id, defaultImage) {
      const eventsApi = getLinkedEventsEventsApi();
      const event = await eventsApi.eventRetrieve(id);
      return translateEvent(event, defaultImage);
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config.get("uploads:path"));
      },
      filename: (req, file, cb) => {
        let uploadFolder = config.get("uploads:path");
        let fileName = file.originalname;
        let fileCount = 0;
        let filePath = uploadFolder + fileName;
        let nameWithoutExtension = fileName;
        let extension = "";

        if (fileName.lastIndexOf(".") > -1) {
          nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf("."));
          extension = fileName.substring(fileName.lastIndexOf("."));
        }

        while (fs.existsSync(filePath)) {
          fileCount++;
          fileName = nameWithoutExtension + "_" + fileCount + extension;
          filePath = uploadFolder + fileName;
        }

        cb(null, fileName);
      }
    });

    const upload = multer({
      storage: storage,
      fileFilter: function (req, file, callback) {
        const ext = path.extname(file.originalname);
        if (ext == ".png" || ext == ".jpg" || ext == ".gif" || ext == ".jpeg") {
          return callback(null, true);
        }

        callback(new Error("Only images are allowed"));
      },
      limits: {
        fileSize: 2097152,
        files: 1
      }
    });

    app.get(Common.EVENTS_FOLDER, (req, res, next) => {
      try {
        res.render("pages/events-list.pug", Object.assign(req.kuntaApi.data, {
          breadcrumbs: [{ path: Common.EVENTS_FOLDER, title: "Tapahtumat" }]
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });


    app.get("/ajax/events", async (req, res, next) => {
      try {
        const perPage = Common.EVENTS_COUNT_PAGE;
        const page = parseInt(req.query.page) || 0;
        const start = req.query.start ? moment(req.query.start, "DD.MM.YYYY") : moment();
        const end = req.query.end ? moment(req.query.end, "DD.MM.YYYY").endOf("day") : null;

        const events = await listEvents(perPage, page + 1, start, end, "/gfx/layout/tapahtuma_default_120_95.jpg");
        const lastPage = events.length < perPage;

        res.render("ajax/events-list.pug", Object.assign(req.kuntaApi.data, {
          page: page,
          lastPage: lastPage,
          events: events
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.get(util.format("%s/uusi", Common.EVENTS_FOLDER), async (req, res, next) => {
      try {
        const filterApi = getLinkedEventsFilterApi();
        const dataSource = config.get("linkedevents:datasource");

        const latestEvents = await listEvents(50, 1, moment(), null, null);

        const keywords = (await filterApi.keywordList({
          dataSource: dataSource
        })).data;

        const viewModel = require(`${__dirname}/forms/create-event`);

        const keywordsSection = viewModel.sections.find(section => section.name === "keywords");

        keywordsSection.fields = [
          {
            "type": "checklist",
            "name": "keywords",
            "options": keywords.map((keyword) => {
              return {
                name: keyword.id,
                text: keyword.name.fi
              };
            })
          }
        ];

        res.render("pages/event-new", Object.assign(req.kuntaApi.data, {
          viewModel: viewModel,
          plugins: [metaformFields.templates()],
          latestEvents: latestEvents,
          defaultImages: JSON.stringify(config.get("linkedevents:defaultImages") || []),
          breadcrumbs: [
            { path: Common.EVENTS_FOLDER, title: "Tapahtumat" },
            { path: util.format("%s/uusi", Common.EVENTS_FOLDER), title: "Uusi" }
          ]
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.get(util.format("%s/ehdot", Common.EVENTS_FOLDER), (req, res, next) => {
      try {
        res.render("pages/terms", req.kuntaApi.data);
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.get(util.format("%s/:id", Common.EVENTS_FOLDER), async (req, res, next) => {
      try {
        const id = req.params.id;
        const event = await findEvent(id, null);
        const latestEvents = await listEvents(50, 1, moment(), null, null);

        res.render("pages/event.pug", Object.assign(req.kuntaApi.data, {
          event: event,
          latestEvents: latestEvents,
          breadcrumbs: [
            { path: Common.EVENTS_FOLDER, title: "Tapahtumat" },
            { path: util.format("%s/%s", Common.EVENTS_FOLDER, id), title: event.name }
          ],
          baseUrl: req.protocol + "://" + req.get("host"),
          pageRoute: req.originalUrl,
          ogTitle: entities.decode(event.name),
          ogContent: entities.decode(striptags(event.description))
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.get("/linkedevents/places/search", async (req, res, next) => {
      try {
        const text = req.query.q;
        const page = req.query.page || 1;
        const pageSize = Common.LINKEDEVENTS_MAX_PLACES;

        const filterApi = getLinkedEventsFilterApi();
        const dataSource = config.get("linkedevents:datasource");

        const options = {
          showAllPlaces: true,
          text: text,
          dataSource: dataSource,
          page: page,
          pageSize: pageSize
        };

        const places = (await filterApi.placeList(options)).data;

        res.send(_.map(places, (place) => {
          return {
            value: place.id,
            label: place.name ? place.name.fi : ""
          };
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.get("/ajax/linkedevents/places/new", (req, res, next) => {
      try {
        res.render("ajax/place-new", Object.assign(req.kuntaApi.data, {
          viewModel: require(`${__dirname}/forms/create-place`),
          plugins: [metaformFields.templates()]
        }));
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.post("/linkedevents/places/create", async (req, res, next) => {
      try {
        const placeData = {
          "publication_status": "public",
          "name": {
            "fi": req.body["name-fi"],
            "sv": req.body["name-sv"],
            "en": req.body["name-en"]
          }
        };

        const filterApi = getLinkedEventsFilterApi();
        const dataSource = config.get("linkedevents:datasource");
        const publisher = config.get("linkedevents:publisher");

        const place = await filterApi.placeCreate({
          placeObject: LinkedEventsClient.Place.constructFromObject(Object.assign({
            "data_source": dataSource,
            "publisher": publisher,
            "origin_id": uuidv4(),
            "deleted": false
          }, placeData))
        });

        res.send(place);
      } catch (err) {
        next({
          status: (err.response ? err.response.status : 500) || 500,
          error: err
        });
      }
    });

    app.get("/linkedevents/keywords/search", (req, res, next) => {
      try {
        const text = req.query.text;
        const page = req.query.page || 1;
        const pageSize = Common.LINKEDEVENTS_MAX_PLACES;

        new ModulesClass(config)
          .linkedevents.searchKeywords(text, page, pageSize)
          .callback((data) => {
            const keywords = data[0].data || [];
            res.send(_.map(keywords, (keyword) => {
              return {
                value: keyword.id,
                label: keyword.name ? keyword.name.fi : ""
              };
            }));
          });
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.post("/linkedevents/image", upload.single("file"), (req, res, next) => {
      try {
        const deleteKey = uuidv4();
        const deleteKeyFilePath = config.get("uploads:path") + req.file.filename + "." + deleteKey;
        const fileUrl = config.get("uploads:baseUrl") + req.file.filename;

        fs.closeSync(fs.openSync(deleteKeyFilePath, "w"));

        res.send([{
          _id: fileUrl,
          filename: req.file.filename,
          originalname: req.file.filename,
          deleteKey: deleteKey,
          url: fileUrl
        }]);
      } catch (err) {
        next({
          status: 500,
          error: err
        });
      }
    });

    app.delete("/linkedevents/image/:filename", (req, res) => {
      const filename = req.params.filename;
      const fileDeleteKey = req.query.c;
      const uploadFolder = config.get("uploads:path") || "uploads/";
      const keyFilePath = uploadFolder + filename + "." + fileDeleteKey;

      if (fs.existsSync(keyFilePath)) {
        fs.unlinkSync(keyFilePath);
        fs.unlinkSync(uploadFolder + filename);
        res.status(204).send();
      } else {
        res.status(401).send();
      }
    });

    app.post("/linkedevents/event/create", async (req, res, next) => {
      try {
        const eventApi = getLinkedEventsEventsApi();
        const filterApi = getLinkedEventsFilterApi();
        const dataSource = config.get("linkedevents:datasource");
        const publisher = config.get("linkedevents:publisher");
        const linkedEventsURL = config.get("linkedevents:api-url");

        let keywordIds = req.body["keywords"] || [];
        if (!Array.isArray(keywordIds)) {
          keywordIds = [keywordIds];
        }

        const keywords = keywordIds.map((keywordId) => {
          return { "@id": `${linkedEventsURL}/keyword/${keywordId}/` };
        });

        let imageUrls = [];
        if (req.body["image-url"]) {
          imageUrls.push(req.body["image-url"]);
        }

        if (req.body["image"]) {
          if (Array.isArray(req.body["image"])) {
            imageUrls = imageUrls.concat(req.body["image"]);
          } else {
            imageUrls.push(req.body["image"]);
          }
        }

        for (let i = 0; i < imageUrls.length; i++) {
          if (!validator.isURL(imageUrls[i], { require_tld: false })) {
            res.status(400).send("Kuvan osoitteen pitää olla URL-osoite. Mikäli olet lataamassa kuvaa omalta tietokoneeltasi, klikkaa lisää tiedosto - painiketta.");
            return;
          }
        }

        if (!imageUrls.length && req.body["default-image-url"]) {
          imageUrls.push(req.body["default-image-url"]);
        }

        const nameFi = (req.body["name-fi"] || "").trim();
        if (!nameFi) {
          res.status(400).send("Nimi (Suomi) on pakollinen");
          return;
        }

        const locationId = req.body.location;
        if (!locationId) {
          res.status(400).send("Paikka on pakollinen");
          return;
        }

        const location = await filterApi.placeRetrieve(locationId);
        if (!location) {
          res.status(400).send("Tapahtumapaikka on virheellinen. Ole hyvä ja valitse tapahtumapaikka listasta.");
          return;
        }

        const notFree = req.body["has-price"];
        const isRegistration = req.body["is-registration"];

        const eventData = {
          "publication_status": "draft",
          "name": {
            "fi": nameFi,
            "sv": req.body["name-sv"],
            "en": req.body["name-en"]
          },
          "description": {
            "fi": req.body["description-fi"],
            "sv": req.body["description-sv"],
            "en": req.body["description-en"]
          },
          "short_description": {
            "fi": truncateDescription(req.body["description-fi"]),
            "sv": truncateDescription(req.body["description-sv"]),
            "en": truncateDescription(req.body["description-en"])
          },
          "custom_data": {
            "provider-fi": req.body["provider"],
            "provider-phone": req.body["provider-phone-number"],
            "provider-email": req.body["provider-email-address"],
            "responsible-fi": req.body["responsible"],
            "responsible-phone": req.body["responsible-phone-number"],
            "responsible-email": req.body["responsible-email-address"],
            "isRegistration": req.body["is-registration"] || false,
            "registration-fi": isRegistration ? req.body["registration-fi"] : req.body["no-registration-fi"],
            "registration-sv": isRegistration ? req.body["registration-sv"] : req.body["no-registration-sv"],
            "registration-en": isRegistration ? req.body["registration-en"] : req.body["no-registration-en"],
            "registration_url": req.body["registration-url"],
          },
          "image-urls": imageUrls,
          "keywords": keywords,
          "location": { "@id": `${linkedEventsURL}/place/${locationId}/` },
          "offers": [{
            "is_free": req.body["has-price"],
            "price": {
              "fi": notFree ? req.body["price-fi"] : req.body["free-price-fi"],
              "sv": notFree ? req.body["price-sv"] : req.body["free-price-sv"],
              "en": notFree ? req.body["price-en"] : req.body["free-price-en"]
            },
            "info_url": req.body["price-url"],
            "description": null
          }],
        };

        console.log("eventData", eventData);

        const startDateTime = req.body["start-date-time"];
        const startDate = req.body["start-date"];
        const endDateTime = req.body["end-date-time"];
        const endDate = req.body["end-date"];


        const hasStartTime = !!startDateTime;
        const hasEndTime = !!endDateTime;

        if (!startDate && !startDateTime) {
          res.status(400).send("Alkamispäivämäärä on pakollinen");
          return;
        }

        if (!endDate && !endDateTime) {
          res.status(400).send("Loppumispäivämäärä on pakollinen");
          return;
        }

        const eventStart = startDateTime ? moment.tz(startDateTime, moment.ISO_8601, "Europe/Helsinki") : moment(startDate, moment.ISO_8601);
        if (!eventStart.isValid()) {
          res.status(400).send("Alkamispäivämäärä tai aika on virheellisen muotoinen. Ole hyvä ja käytä muotoa VVVV-MM-DD (esim. 2019-12-24) ja muotoa HH:MM (esim 10:30)");
          return;
        }

        const eventEnd = endDateTime ? moment.tz(endDateTime, moment.ISO_8601, "Europe/Helsinki") : moment(endDate, moment.ISO_8601);
        if (!eventEnd.isValid()) {
          res.status(400).send("Loppumispäivämäärä tai aika on virheellisen muotoinen. Ole hyvä ja käytä muotoa VVVV-MM-DD (esim. 2019-12-24) ja muotoa HH:MM (esim 10:30)");
          return;
        }

        if (eventStart.isAfter(eventEnd)) {
          res.status(400).send("Alkamisaika ei voi olla loppumisajan jälkeen");
          return;
        }



        eventData["start_time"] = hasStartTime ? eventStart.format() : eventStart.format("YYYY-MM-DD");
        eventData["has_start_time"] = hasStartTime;

        eventData["end_time"] = hasEndTime ? eventEnd.format() : eventEnd.format("YYYY-MM-DD");
        eventData["has_end_time"] = hasEndTime;

        await eventApi.eventCreate({
          eventObject: LinkedEventsClient.Event.constructFromObject(Object.assign({
            "data_source": dataSource,
            "publisher": publisher
          }, eventData))
        });

        res.sendStatus(200);
      } catch (err) {
        next({
          status: (err.response ? err.response.status : 500) || 500,
          error: err
        });
      }
    });

  };

}).call(this);