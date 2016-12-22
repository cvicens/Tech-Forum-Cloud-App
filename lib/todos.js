var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var db = require('./db-store');

var logger = require('./logger');

var COLLECTION_NAME = "todos";

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  /*router.get('/', function(req, res) {
    var todoId = req.query.todoId;
    console.log('todoId ' + todoId);
    if (typeof todoId === 'undefined' || todoId === '') {
      res.status(404).json([]);
      return;
    }
    // Finding an todo by todoId
    db.read(COLLECTION_NAME, todoId, function (err, data) {
      if (err) {
        res.status(500).json({result:'ERROR', msg: err})
      } else {
        res.status(200).json(data);
      }
    });
  });*/

  router.get('/', function(req, res) {
    logger.info ('GET /');
    db.list(COLLECTION_NAME, null, function (err, data) {
      if (err) {
        res.status(500).json({result:'ERROR', msg: err})
      } else {
        res.status(200).json(data);
      }
    });
  });

  router.get('/id/:todoId', function(req, res) {
    var todoId = req.params.todoId;
    console.log('todoId ' + todoId);
    if (typeof todoId === 'undefined' || todoId === '') {
      res.status(404).json([]);
      return;
    }
    /**
     * Finding an todo by todoId
     */
    db.read(COLLECTION_NAME, todoId, function (err, data) {
      if (err) {
        res.status(500).json({result:'ERROR', msg: err})
      } else {
        res.status(200).json(data);
      }
    });
  });

  router.get('/title/:title', function(req, res) {
    var title = req.params.title;
    console.log('title', title);
    if (typeof title === 'undefined' || title === '') {
      res.status(400).json([]);
      return;
    }

    /**
     * Finding an registrant by title, ...
     */
    var filter = {
      "like": {
        "title": title
      }
    };
    console.log('title', title, 'filter', filter);
    db.list(COLLECTION_NAME, filter, function (err, data) {
      if (err) {
        res.status(500).json({result:'ERROR', msg: err})
      } else {
        res.status(200).json(data);
      }
    });
  });

  router.post('/', function(req, res) {
    var todo = req.body;
    console.log('todo: ' + todo);
    if (typeof todo === 'undefined') {
      res.status(404).json([]);
      return;
    }
    db.update(COLLECTION_NAME, todo, function (err, data) {
      if (err) {
        res.status(500).json({result:'ERROR', msg: err})
      } else {
        res.status(200).json(data);
      }
    });
  });

  return router;
}

module.exports = route;
