var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var $fh = require('fh-mbaas-api');
var q = require('q');

function getFormDetail(formId) {
  var deferred = q.defer();

  $fh.forms.getForm({
    "_id": formId
  }, function (err, form) {
    if (err) deferred.reject(err);
    console.log('>>> form', form);
    deferred.resolve(form);
  });

  return deferred.promise;
}

function getProjectForms() {
  var deferred = q.defer();

  var options = {

  };
  $fh.forms.getForms(options, function (err, response) {
    if (err) deferred.reject(err);
    deferred.resolve(response);
  });

  return deferred.promise;
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  // GET REST endpoint - query params may or may not be populated
  router.get('/new', function(req, res) {
    var forms = [];
    getProjectForms()
    .then(function (response) {
      forms = response.forms;
      var promises = [];
      for (var i = 0; i < forms.length; i++) {
        promises.push(getFormDetail(forms[i]._id));
      }
      return q.all(promises);
    })
    .then(function (formDetails) {
      console.log('formDetails', formDetails);
      for (var i = 0; i < forms.length; i++) {
        forms[i].detail = formDetails[i];
      }
      res.json({code: 'OK',forms: forms});
    })
    .catch(function (err) {
      if (err) {
        res.status(500).json({err: err});
      }
    });
  });

  // GET REST endpoint - query params may or may not be populated
  router.get('/', function(req, res) {
    var options = {

    };
    $fh.forms.getForms(options, function (err, response) {
      if (err) {
        res.status(500).json({err: err});
      }

      var forms = response.forms;

      res.json({code: 'OK',forms: forms});
    });
  });

  // GET REST endpoint - query params may or may not be populated
  router.get('/:formId', function(req, res) {
    var formId = req.params.formId;
    console.log('formId: ' + formId);
    if (typeof formId === 'undefined') {
      res.status(400).json([]);
      return;
    }

    getFormDetail(formId)
    .then(function (formDetail) {
      console.log('formDetail', formDetail);
      res.json({code: 'OK',formDetail: formDetail});
    })
    .catch(function (err) {
      if (err) {
        res.status(500).json({err: err});
      }
    });
  });

  return router;
}

module.exports = route;
