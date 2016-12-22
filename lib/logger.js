'use strict';

var winston = require('winston');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            timestamp: true
        }),
        new (winston.transports.File)({ filename: './digital-enterprise-cloud.log' })
    ]
});

module.exports = logger;
