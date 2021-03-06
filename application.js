var mbaasApi = require('fh-mbaas-api');
var express = require('express');
var mbaasExpress = mbaasApi.mbaasExpress();
var cors = require('cors');

// list the endpoints which you want to make securable here
var securableEndpoints;
securableEndpoints = ['/hello', '/submissions'];

var app = express();

// Enable CORS for all requests
app.use(cors());

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys(securableEndpoints));
app.use('/mbaas', mbaasExpress.mbaas);

// allow serving of static files from the public directory
app.use(express.static(__dirname + '/public'));

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

app.use('/hello', require('./lib/hello.js')());
app.use('/submissions', require('./lib/submissions.js')());
app.use('/forms', require('./lib/forms.js')());
app.use('/todos', require('./lib/todos.js')());

app.post('/box/srv/1.1/admin/authpolicy/auth', function(req, res) {
    var user = req.body.params.userId;
    var pass = req.body.params.password;
    if (user === "test" && pass === "test") {
        res.json({'status': 'ok','message': 'Successfully Authenticated'});
    } else {
        res.status(401).json({'status': 'unauthorised','message': 'unauthorised'});
    }
});

// Important that this is last!
app.use(mbaasExpress.errorHandler());

// Register Form Submission listener
require('./lib/submissionEventListener');

var port = process.env.FH_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8101;
var host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.listen(port, host, function() {
  console.log("App started at: " + new Date() + " on port: " + port);
});
