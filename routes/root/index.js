/*jshint esversion: 6 */
/* global __dirname */

(function() {
  "use strict";

  const util = require("util");
  const moment = require("moment");
  const cheerio = require("cheerio");
  const _ = require("lodash");
  const $ = require("cheerio");
  const Common = require(__dirname + "/../common");
  const Autolinker = require("autolinker");

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

  module.exports = (app, config, ModulesClass) => {
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
      const eventsApi = Common.getLinkedEventsEventsApi(config);

      const listOptions = {
        sort: "end_time",
        page: page,
        pageSize: perPage
      };

      if (start) {
        listOptions["start"] = start.toDate();
      }

      if (end) {
        listOptions["end"] = end.toDate();
      }

      const events = (await eventsApi.eventList(listOptions)).data;

      return events.map(event => translateEvent(event, defaultImage));
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
        id: event.id,
        name: name,
        start: start,
        shortDate: moment(event.start_time).format("D.M.YYYY"),
        imageSrc: imageUrl || defaultImage,
        description: Common.plainTextParagraphs(Autolinker.link(description)),
        shortDescription: _.truncate(shortDescription, { length: 200 })
      };
    }

    app.get("/", async (req, res, next) => {
      const incomingEvents = await listEvents(Common.EVENT_COUNT, 1, moment(), undefined, "/gfx/layout/tapahtuma_default_120_95.jpg");
      const currentEvents = await listEvents(Common.EVENT_COUNT, 1, moment().startOf("day"), moment().endOf("day"), "/gfx/layout/tapahtuma_default_120_95.jpg");

      new ModulesClass(config).news
        .latest(0, 5)
        .banners.list()
        .announcements.list(Common.ANNOUNCEMENT_COUNT, "PUBLICATION_DATE", "DESCENDING")
        .pages.getContent(Common.MOVIES_PAGE_ID)
        .callback(
          function(data) {
            const path = req.path.substring(9);
            const activeMovies = Common.parseActiveMovies(Common.processPageContent(path, data[3]));
            const news = _.clone(data[0]).map(newsArticle => {
              return Object.assign(newsArticle, {
                shortAbstract: _.truncate($.load(newsArticle.abstract).text(), {
                  length: 160
                }),
                shortDate: moment(newsArticle.published).format("D.M.YYYY"),
                imageSrc: newsArticle.imageId ? util.format("/newsArticleImages/%s/%s", newsArticle.id, newsArticle.imageId) : null
              });
            });

            const movieBanner = data[1].filter(banner => {
              return banner.title === "elokuva-banneri";
            });

            const bannersWithoutMovies = data[1].filter(banner => {
              return banner.title !== "elokuva-banneri";
            });

            var banners = _.clone(bannersWithoutMovies || []).map(banner => {
              var styles = [];

              if (banner.textColor) {
                styles.push(util.format("color: %s", banner.textColor));
              }

              if (banner.backgroundColor) {
                styles.push(util.format("background-color: %s", banner.backgroundColor));
              }

              return Object.assign(banner, {
                imageSrc: banner.imageId ? util.format("/bannerImages/%s/%s", banner.id, banner.imageId) : "/gfx/layout/default_banner.jpg",
                bgcolor: banner.backgroundColor ? banner.backgroundColor : "rgba(255, 255, 255, 0.3)"
              });
            });

            var announcements = _.clone(data[2] || []).map(announcement => {
              return Object.assign(announcement, {
                shortDate: moment(announcement.published).format("D.M.YYYY")
              });
            });

            var eventsNow = _.clone(currentEvents || []).map(event => {
              return event;
            });

            var eventsIncoming = _.clone(incomingEvents || []).map(event => {
              return event;
            });

            const movieImageUrls = _.uniq(
              activeMovies.map(movie => {
                return movie.imageUrl;
              })
            );

            if (movieImageUrls.length < 1) {
              movieImageUrls.push("/gfx/layout/default_movie_banner.jpg");
            }

            res.render(
              "pages/index.pug",
              Object.assign(req.kuntaApi.data, {
                banners: banners,
                announcements: announcements,
                news: news,
                eventsNow: eventsNow,
                eventsIncoming: eventsIncoming,
                movieImageUrls: movieImageUrls.filter(Boolean),
                movieBanner: movieBanner[0] ? movieBanner[0] : null
              })
            );
          },
          err => {
            next({
              status: 500,
              error: err
            });
          }
        );
    });
  };
}.call(this));
