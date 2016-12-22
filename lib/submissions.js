var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var $fh = require('fh-mbaas-api');
//var q = require('q');

var FORM_ID = process.env.FORM_ID || '58073be0d83e785d6fd4c869';

var BACKEND_SERVICE_GUID = process.env.BACKEND_SERVICE_GUID || 'bhtr6k4ksncvdfzm4pvzdsmo';

console.log('ENV FORM_ID', FORM_ID, ' BACKEND_SERVICE_GUID', BACKEND_SERVICE_GUID);

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

function persistSubmission(submission) {
    return new Promise(function(resolve, reject) {
      if (typeof BACKEND_SERVICE_GUID === 'undefined') {
        reject('Enviroment variable BACKEND_SERVICE_GUID not defined in Cloud App!');
        return;
      }

      var path = '/submissions';
      console.log('path: ' + path);

      /**
       * Finding a list of accounts located in mongo database
       */
      $fh.service({
        "guid" : BACKEND_SERVICE_GUID, // The 24 character unique id of the service
        "path": path, //the path part of the url excluding the hostname - this will be added automatically
        "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
        "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
        //"headers" : {
          // Custom headers to add to the request. These will be appended to the default headers.
        //}
        "params": submission
      }, function(err, body, response) {
        console.log('statuscode: ', response && response.statusCode);
        if (err) {
          // An error occurred during the call to the service. log some debugging information
          console.log(path + ' service call failed - err : ', err);
          reject(err)
        } else {
          //console.log(systemid + '/' + customerid + ' got response from service - status body : ', response.statusCode, body);
          resolve(body)
        }
      });
    });
}

/*function postSubmission (submission) {
  var deferred = q.defer();

  if (typeof BACKEND_SERVICE_GUID === 'undefined') {
    deferred.reject('Enviroment variable BACKEND_SERVICE_GUID not defined in Cloud App!');
    return deferred.promise;
  }

  var path = '/submissions';
  console.log('path: ' + path);

  $fh.service({
    "guid" : BACKEND_SERVICE_GUID, // The 24 character unique id of the service
    "path": path, //the path part of the url excluding the hostname - this will be added automatically
    "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
    "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
    //"headers" : {
      // Custom headers to add to the request. These will be appended to the default headers.
    //}
    "params": submission
  }, function(err, body, response) {
    console.log('statuscode: ', response && response.statusCode);
    if (err) {
      // An error occurred during the call to the service. log some debugging information
      console.log(path + ' service call failed - err : ', err);
      deferred.reject(err)
    } else {
      //console.log(systemid + '/' + customerid + ' got response from service - status body : ', response.statusCode, body);
      deferred.resolve(body)
    }
  });

  return deferred.promise // the promise is returned
}*/

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

//NodeJS Events Module. Note, this is required to register event emitter objects to forms.
var events = require('events');
var submissionEventListener = new events.EventEmitter();

submissionEventListener.on('submissionComplete', function(params){
  var submissionId = params.submissionId;
  var submissionCompletedTimestamp = params.submissionCompletedTimestamp;
  var submission = params.submission;
  submission.formName = params.submission.formSubmittedAgainst ?  params.submission.formSubmittedAgainst.name : 'N/A';
  console.log("Submission with ID " + submissionId + " has completed at " + submissionCompletedTimestamp);
  console.log("Submission: " + JSON.stringify(submission));
  persistSubmission(submission)
  .then(function (result) {
    console.log('submission sent correctly result:', result);
  })
  .catch(function (err) {
    console.error('Error while posting submission', err);
  });
});

submissionEventListener.on('submissionError', function(error){
  console.log("Error Submitting Form");
  console.log('error', JSON.stringify(error));
  console.log("Error Type: ", error.type);
});

$fh.forms.registerListener(submissionEventListener, function(err){
  console.log('registering listener: submissionEventListener');
  if (err) return handleError(err);

  //submissionEventListener has now been registered with the $fh.forms Cloud API. Any valid Forms Events will now emit.
});

var options = {

};

function handleFormError (err) {
  console.log('Error: ' + err);
}

function handleFormSubmissions (submissions) {
  for (var submission in submissions) {
    console.log('submission : ' + JSON.stringify(submission));
  }
}

function route() {
  var router = new express.Router();
  router.use(cors());
  router.use(bodyParser());

  // GET REST endpoint - query params may or may not be populated
  router.get('/', function(req, res) {
    console.log('FORM_ID', FORM_ID);
    $fh.forms.getSubmissions({
        //"formId": ['57610bc3e8a06a2445157d14', FORM_ID]
        "formId": [FORM_ID]
      }, function (err, response) {
      if (err) {
        res.json({err: err});
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
    })
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
