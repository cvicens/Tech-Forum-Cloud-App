var logger = require('./logger');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var $fh = require('fh-mbaas-api');

const env = require('./environment');
console.log('ENV FORM_ID', env.FORM_ID, ' BACKEND_SERVICE_GUID', env.BACKEND_SERVICE_GUID);

function getFormDetail(formId) {
  return new Promise(function(resolve, reject) {
    $fh.forms.getForm({
      "_id": formId
    }, function (err, form) {
      if (err) reject(err);
      console.log('>>> form', form);
      resolve(form);
    });
  });
}

function submitFormData(submission, appClientId) {
    return new Promise(function(resolve, reject) {
      var options = {
        "submission": submission
      };
      if (appClientId) {
        options.appClientId = appClientId;
      }
      console.log('options', JSON.stringify(options));

      $fh.forms.submitFormData(options, function(err,data){
        console.log('data', data, 'err', err);
        if(err) return reject(err);
        return resolve(data);
      });
    });
}

function submitFormDataModel(form, fields) {
    return new Promise(function(resolve, reject) {
      var options = {
        "form": form
      };

      console.log('form', JSON.stringify(form), 'fields', JSON.stringify(fields));

      $fh.forms.createSubmissionModel(options, function(err, submissionModel){
        if (err) {
          reject(err);
        } else {
          for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var fieldValues = field.fieldValues;
            console.log('> field', field);
            if (fieldValues) {
              for (var j = 0; j < fieldValues.length; j++) {
                var fieldValue = fieldValues[j];
                var fieldInputOptions = {
                  "fieldId": field.fieldId,
                  "fieldCode": field.fieldId,
                  "index": j,
                  "value": fieldValue
                };
                console.log('>> fieldInputOptions', fieldInputOptions);
                //Note: the addFieldInput function is not asynchronous
                var error = submissionModel.addFieldInput(fieldInputOptions);
                console.log('>> error', error);
                if(error){
                  reject(error);
                }
              }
            }
          }

          /*
          Submitting the data as part of a submission.
          This function will upload all files passed to the submission using the addFieldInput function
          */
          submissionModel.submit(function(err, submissionId){
            if(err) {
              reject(err);
            }
            resolve(submissionId);
          });
        }
      });
    });
}

function getPersistedSubmissions() {
  logger.error('submissions: getPersistedSubmissions');
  return new Promise(function(resolve, reject) {
    if (typeof env.BACKEND_SERVICE_GUID === 'undefined') {
      reject('Enviroment variable BACKEND_SERVICE_GUID not defined in Cloud App!');
      return;
    }

    var path = '/submissions';
    logger.debug('path: ' + path);

    /**
     * Finding a list of accounts located in mongo database
     */
    $fh.service({
      "guid" : env.BACKEND_SERVICE_GUID, // The 24 character unique id of the service
      "path": path, //the path part of the url excluding the hostname - this will be added automatically
      "method": "GET",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
      "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
    }, function(err, body, response) {
      logger.debug('statuscode: ', response && response.statusCode);
      if (err) {
        // An error occurred during the call to the service. log some debugging information
        logger.error(path + ' service call failed - err : ', err);
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

var options = {

};

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  // GET REST endpoint - query params may or may not be populated
  router.get('/', function(req, res) {
    logger.debug('FORM_ID', env.FORM_ID);
    $fh.forms.getSubmissions({
        //"formId": ['57610bc3e8a06a2445157d14', FORM_ID]
        "formId": [env.FORM_ID]
      }, function (err, response) {
      if (err) {
        res.json({err: err});
        return;
      }

      var submissions = [];
      if (response.submissions && response.submissions.submissions) {
      //console.log('submissions.submissions: ' + JSON.stringify(response.submissions.submissions));
        for (var i = 0; i < response.submissions.submissions.length; i++) {
          var formSubmission = response.submissions.submissions[i];
          //if (formSubmission.formId === FORM_ID) { // TODO Comparacion... ojo, hay un API para filtrar... pero no esta claro...
            var submission = {_id: formSubmission._id, formName: formSubmission.formName, formId: formSubmission.formId};
                var fields = [];
                if (formSubmission.formFields) {
                  //console.log('formFields: ' + JSON.stringify(formSubmission.formFields));
                  for (var j = 0; j < formSubmission.formFields.length; j++) {
                      var formField = formSubmission.formFields[j];
                      var field = {name: formField.fieldId.name, type: formField.fieldId.type, values: formField.fieldValues}
                      fields.push(field);
                  }

                }
                submission.fields = fields;
            submissions.push(submission);
          //}

        }
      }
      res.json({code: 'OK', submissions: submissions});
    });
  });

  // GET submissions from backend mongodb service
  router.get('/data', function(req, res) {

    getPersistedSubmissions()
    .then(function (submissions) {
      for (var i = 0; i < submissions.length; i++) {
        var submission = submissions[i];
        var fields = [];
        var formSubmittedAgainst = submission.formSubmittedAgainst;
        var fieldRefs = formSubmittedAgainst.fieldRef;
        for (var j = 0; j < submission.formFields.length; j++) {
          var formField = submission.formFields[j];
          var fieldRef = fieldRefs[formField.fieldId];
          var name = formSubmittedAgainst.pages[fieldRef.page].fields[fieldRef.field].name;
          var field = {fieldId: formField.fieldId, values: formField.fieldValues, name: name};
          fields.push(field);
        }
        submission.fields = fields;
      }
      return submissions;
    })
    .then(function (submissions) {
      res.json({code: 'OK', submissions: submissions});
    })
    .catch(function (err) {
      res.status(500).json({result:'ERROR', msg: err})
    });
  });

  /*
      {
      "formId": "<<ID Of Form Submitting Agains>>",
      "deviceId": "<<ID of the device submitting the form>>",
      "deviceIPAddress": "<<IP Address of the device submitting the form>>",
      "formFields": [<<Field Entry JSON Object>>],
      "deviceFormTimestamp": "<<lastUpdatedTimestamp of the Form that the submission was submitted against.>>",
      "comments": [{ //Optional comments related to the submission
        "madeBy": "user",
        "madeOn": "12/11/10",
        "value": "This is a comment"
      }]
      }
  */
  router.post('/', function(req, res) {
    var payload = req.body;
    console.log('payload: ' + payload);
    if (typeof payload === 'undefined' ||
        typeof payload.submission === 'undefined') {
      res.status(400).json([]);
      return;
    }

    submitFormData(payload.submission, payload.appClientId)
    .then(function (result) {
      res.status(200).json(result);
    })
    .catch(function (err) {
      res.status(500).json({result:'ERROR', msg: err})
    });
  });

  /*
      {
      "formId": "<<ID Of Form Submitting Agains>>",
      "deviceId": "<<ID of the device submitting the form>>",
      "deviceIPAddress": "<<IP Address of the device submitting the form>>",
      "formFields": [<<Field Entry JSON Object>>],
      "deviceFormTimestamp": "<<lastUpdatedTimestamp of the Form that the submission was submitted against.>>",
      "comments": [{ //Optional comments related to the submission
        "madeBy": "user",
        "madeOn": "12/11/10",
        "value": "This is a comment"
      }]
      }
  */
  router.post('/model', function(req, res) {
    var payload = req.body;
    console.log('payload: ' + payload);
    if (typeof payload === 'undefined' ||
        typeof payload.formId === 'undefined' ||
        typeof payload.fields === 'undefined') {
      res.status(400).json([]);
      return;
    }

    getFormDetail(payload.formId)
    .then(function (form) {
        return submitFormDataModel(form, payload.fields);
    })
    .then(function (result) {
      res.status(200).json(result);
    })
    .catch(function (err) {
      res.status(500).json({result:'ERROR', msg: err})
    })
  });

  return router;
}

module.exports = route;
