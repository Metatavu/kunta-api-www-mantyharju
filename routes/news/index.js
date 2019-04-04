/*jshint esversion: 6 */
/* global __dirname */

(function() {
  'use strict';

  const util = require('util');
  const moment = require('moment');
  const Common = require(__dirname + '/../common');
  const striptags = require('striptags');
  const Feed = require('feed').Feed;
  const Entities = require('html-entities').AllHtmlEntities;
  const entities = new Entities();

  module.exports = (app, config, ModulesClass) => {
    
    app.get('/newsArticleImages/:newsArticleId/:imageId', (req, res, next) => {
      var newsArticleId = req.params.newsArticleId;
      var imageId = req.params.imageId;
      
      if (!newsArticleId || !imageId) {
        next({
          status: 404
        });
        
        return;
      }
      
      new ModulesClass(config)
        .news.streamImageData(newsArticleId, imageId, req.query, req.headers)
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
    
    app.get(util.format('%s/:slug', Common.NEWS_FOLDER), (req, res, next) => {
      var slug = req.params.slug;

      if (!slug) {
        next({
          status: 404
        });
        return;
      }

      new ModulesClass(config)
        .news.latest(0, 10)
        .news.findBySlug(slug)
        .callback(function(data) {
          var newsArticle = data[1];
          var siblings = data[0];
          if (!newsArticle) {
            next({
              status: 404
            });
            return;
          }
          
          res.render('pages/news-article.pug', Object.assign(req.kuntaApi.data, {
            baseUrl : req.protocol + '://' + req.get('host'),
            pageRoute: req.originalUrl,
            ogTitle: entities.decode(newsArticle.title),
            ogContent: entities.decode(striptags(newsArticle.contents)),
            id: newsArticle.id,
            slug: newsArticle.slug,
            title: newsArticle.title,
            tags: newsArticle.tags,
            contents: Common.processPageContent('/', newsArticle.contents),
            sidebarContents: Common.getSidebarContent(newsArticle.contents),
            imageSrc: newsArticle.imageId ? util.format('/newsArticleImages/%s/%s', newsArticle.id, newsArticle.imageId) : null,
            siblings: siblings,
            breadcrumbs : [{path: util.format('%s/%s', Common.NEWS_FOLDER, newsArticle.slug), title: newsArticle.title }]
          }));

        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });

    app.get(Common.NEWS_FOLDER + '/', (req, res, next) => {
      const perPage = Common.NEWS_COUNT_PAGE;
      let tag = req.query.tag;
      let page = tag ? null : parseInt(req.query.page)||0;
      let module = new ModulesClass(config);
        
      (tag ? module.news.listByTag(tag) : module.news.latest(page * perPage, perPage + 1))
        .callback((data) => {
          let lastPage = data[0].length < perPage + 1;
          let newsArticles = data[0].splice(0, perPage).map(newsArticle => {
            return Object.assign(newsArticle, {
              "shortDate": moment(newsArticle.published).format("D.M.YYYY"),
              "imageSrc": newsArticle.imageId ? util.format('/newsArticleImages/%s/%s', newsArticle.id, newsArticle.imageId) : null
            });
          });
         
          res.render('pages/news-list.pug', Object.assign(req.kuntaApi.data, {
            page: page,
            lastPage: lastPage,
            newsArticles: newsArticles,
            tag: tag,
            breadcrumbs : [{path: util.format('%s/?tag=%s', Common.NEWS_FOLDER, tag), title: tag ? util.format("Ajankohtaista tagilla '%s'", tag) : 'Ajankohtaista'}]
          }));
        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });

    app.get('/feed/:format', (req, res, next) => {
      const feedFormat = req.params.format;
      if (["rss", "atom", "json"].indexOf(feedFormat) < 0) {
        res.status(400).send("Invalid feed format")
        return;
      }

      const perPage = 20;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const feed = new Feed({
        "title": "Ajankohtaista",
        "link": baseUrl,
        "id": baseUrl,
        feedLinks: {
          json: `${baseUrl}/feed/json`,
          atom: `${baseUrl}/feed/atom`,
          rss: `${baseUrl}/feed/rss`
        },
      });
      new ModulesClass(config).news.latest(0, perPage)
        .callback((data) => {
          let newsArticles = data[0].map(newsArticle => {
            return Object.assign(newsArticle, {
              "shortDate": moment(newsArticle.published).format("D.M.YYYY"),
              "imageSrc": newsArticle.imageId ? util.format('/newsArticleImages/%s/%s', newsArticle.id, newsArticle.imageId) : null
            });
          });

          newsArticles.forEach((newsArticle) => {
            feed.addItem({
              id: `${baseUrl}${Common.NEWS_FOLDER}/${newsArticle.slug}`,
              title: entities.decode(newsArticle.title),
              description: entities.decode(newsArticle.abstract),
              content: entities.decode(newsArticle.contents),
              category: newsArticle.tags,
              link: `${baseUrl}${Common.NEWS_FOLDER}/${newsArticle.slug}`,
              date: moment(newsArticle.published).toDate()
            });
          });

          switch (feedFormat) {
            case "json":
              res.set("Content-Type", "application/json");
              res.status(200).send(feed.json1());
            break;
            case "rss":
              res.set("Content-Type", "application/rss+xml");
              res.status(200).send(feed.rss2());
            break;
            case "atom":
              res.set("Content-Type", "application/atom+xml");
              res.status(200).send(feed.atom1());
            break;
            default:
              res.status(400).send("Invalid feed format")
            break;
          }
        }, (err) => {
          next({
            status: 500,
            error: err
          });
        });
    });

  };

}).call(this);