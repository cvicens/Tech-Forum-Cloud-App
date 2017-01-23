var logger = require('./logger');
var express = require('express');
var $fh = require('fh-mbaas-api');

const env = require('./environment');

function persistSubmission(submission) {
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
        "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
        "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
        //"headers" : {
          // Custom headers to add to the request. These will be appended to the default headers.
        //}
        "params": submission
      }, function(err, body, response) {
        logger.debug('statuscode: ', response && response.statusCode);
        if (err) {
          // An error occurred during the call to the service. log some debugging information
          logger.debug(path + ' service call failed - err : ', err);
          reject(err)
        } else {
          //logger.debug(systemid + '/' + customerid + ' got response from service - status body : ', response.statusCode, body);
          resolve(body)
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
  logger.debug("Submission with ID " + submissionId + " has completed at " + submissionCompletedTimestamp);
  logger.debug("Submission: " + JSON.stringify(submission));
  persistSubmission(submission)
  .then(function (result) {
    logger.debug('submission sent correctly result:', result);
  })
  .catch(function (err) {
    console.error('Error while posting submission', err);
  });
});

submissionEventListener.on('submissionError', function(error){
  logger.debug("Error Submitting Form");
  logger.debug('error', JSON.stringify(error));
  logger.debug("Error Type: ", error.type);
});

$fh.forms.registerListener(submissionEventListener, function(err){
  logger.debug('registering listener: submissionEventListener');
  if (err) return handleError(err);

  //submissionEventListener has now been registered with the $fh.forms Cloud API. Any valid Forms Events will now emit.
});
