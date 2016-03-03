// modules =================================================
var express           = require('express');
var bodyParser        = require('body-parser');
var methodOverride    = require('method-override');
var passport          = require('passport');
var fbStrategy        = require('passport-facebook').Strategy;
var mongoose          = require('mongoose');
var app               = express();
// var configAuth        = require('./config/auth.js');

//need to include this to add user to db
var userController = require('./users/userController');


// configuration ===========================================

// Passport Facebook strategy configuration=================

// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.


passport.use(new fbStrategy({
    clientID:  process.env.FACEBOOK_APP_ID, //|| configAuth.facebookAuth.clientID,
    clientSecret: process.env.FACEBOOK_SECRET, // || configAuth.facebookAuth.clientSecret,
    callbackURL: 'https://whenwhere2.herokuapp.com/login/facebook/return',
    profileFields: ['id', 'displayName', 'picture.height(150).width(150)','friends']
  },
  function(accessToken, refreshToken, profile, cb) {
    //call a function which checks if user is in db
    userController.createOrFindOne(profile);
    return cb(null, profile);
  }));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// config files
var db = require('./config/db');

//db conncection
mongoose.connect(process.env.DB_URL || db.url);
var connection = mongoose.connection;
connection.on('error', function (err) { console.log('db connection err:',err)});

// set our port
var port = process.env.PORT || 3000;

// get all data/stuff of the body (POST) parameters
// parse application/json
app.use(bodyParser.json());

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// parse application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: true }));

// override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override'));

// set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/../public'));
// routes ==================================================
require('./config/routes.js')(app); // configure our routes

// start app ===============================================
// startup our app at http://localhost:3000
app.listen(port);

// shoutout to the user
console.log('Magic happens on port ' + port);

// expose app
exports = module.exports = app;
