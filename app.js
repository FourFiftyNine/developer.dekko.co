
//////////////////////////////////////////////////////////////////////////////////
// node.js expressjs app for dekko developer and user session management
//////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var ejs = require('ejs');
var routes = require('./routes');
var MongoDB = require('./mongo').MongoDB;
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var check = require('validator').check;
var sanitize = require('validator').sanitize;

// var passport = require('passport') , LocalStrategy = require('passport-local').Strategy;

var app = module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "dekko world" }));
  // app.use(passport.initialize());
  // app.use(passport.session());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

////////////////////////////////////////////////////////////////////////////////
// database
////////////////////////////////////////////////////////////////////////////////

var mongo = new MongoDB('127.0.0.1',27017);

////////////////////////////////////////////////////////////////////////////////
// authentication
////////////////////////////////////////////////////////////////////////////////
/*
passport.use(new LocalStrategy(
  function(username, password, done) {
    User.find_one_by({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!user.validPassword(password)) { return done(null, false); }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.find_one_by_id(id, function (err, user) {
    done(err, user);
  });
});
*/
//////////////////////////////////////////////////////////////////////////////////
// go!!!
//////////////////////////////////////////////////////////////////////////////////

app.listen(8002);

//////////////////////////////////////////////////////////////////////////////////
// Page handling
///////////////.//////////////////////////////////////////////////////////////////

function get_state(req,res) {
  // TODO
  // i am not happy with this callback approach to setting state
  // i think a better way is to have a function we call for all render requests and pass it a hash; so we can tack on special variables
  if(req.session.user_id) {
    return { user_id: req.session.user_id, devkey: req.session.devkey };
  }
  return { user_id: null, devkey: null };
}

// test json

app.get('/json0', function(req, res){
  mongo.find_all(function(error, results){ res.send(results); });
});

app.get('/json1/:id', function(req, res) {
  mongo.find_one_by_id(req.params.id, function(error, developer) {
    res.render('json.ejs', { locals: { developer:developer } });
  });
});

app.get('/json2/:id', function(req,res) {
  mongo.find_one_by_id(req.params.id, function(error, developer) {
    res.send(developer);
  });
});

// sign in and out

function check_auth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    res.send('You are not authorized to view this page');
  } else {
    next();
  }
}

function validateEmail(email) { // hacksparrow.com/javascript-email-validation.html
    if (email.length == 0) return false;
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
    return re.test(email);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// routes for session and profile signup, signin and management overall for developers and session playing clients
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var error_message_noauth = 'I did not get enough information to help you - perhaps you need to recover a lost pasword given your email?';
var error_message_2 = 'Sign-on internal error #2';
var error_message_3 = 'Sign-on internal error #3';
var error_message_client_login = 'Client internal error #3';

app.get('/signin', function(req,res) { res.render('profile/signin.ejs', get_state(req,res) ) });
app.get('/profile/signin', function(req,res) { res.render('profile/signin.ejs', get_state(req,res) ) });

app.post('/profile/signin', function(req,res) {

  // TODO password recovery is needed
  // TODO javascript client side dynamic validation of email would be nice too as well as error checking client side
  // TODO sanitize

  var post = req.body;
  var email = post.email;
  var password = post.password;

  if (!email || !password || !validateEmail(email)) { res.send(error_message_noauth); return; }

  email = sanitize(email).xss();
  password = sanitize(password).xss();
  //var salt = 'salty sardines'; // bcrypt.gen_salt_sync(10);
  //var hash = bcrypt.encrypt_sync(password, salt);
  var hash = password; // TODO BAD! we MUST salt and hash


  console.log("signin: looking for " + email );
  mongo.find_one_by({ "email":email},function(error,results) {
    if(error) { res.send(error_message_2); return; }
    if(!results) {
      console.log("signin: adding new ");
      var created_at = new Date();
      var updated_at = new Date();
      var devkey = crypto.createHash('md5').update(email).digest("hex");
      var data = { kind: "developer", devkey: devkey, email: email, password: hash, created_at: created_at, updated_at: updated_at };
      console.log("signin: saving " + data );
      mongo.save( data, function( error, results) {
        console.log("signin: saved user");
        if(error) { res.send(error_message_3); return; }
        console.log("signin: saved user");
        req.session.user_id = email;
        req.session.devkey = devkey;
        res.redirect('/profile');
      });
      console.log("done saving");
      return;
    }
    if(results["password"] == hash) { // if(bcrypt.compare_sync(results["password"],hash)) {
      req.session.user_id = results["email"];
      req.session.devkey = results["devkey"];
      res.redirect('/profile');
      return;
    } else {
      res.send(error_message_noauth);
      return;
    }
    return;
  });
  console.log("signin: should not get here");
});

app.get('/profile/signout', function(req,res) {
  req.session.destroy(); // // delete res.session.user_id;
  res.redirect("/");
  // res.render('profile/signout.ejs', get_state(req,res));
});

function randomString() {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 32;
    var randomstring = '';
    for (var i=0; i<string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum,rnum+1);
    }
    return randomstring;
}


//
//  server ping alive test
//

app.get('/profile/ping', function(req,res) {

  var d = req.query["d"];
  var c = req.query["c"];

  // tidy up dat 
  if(!d) { res.send("error: profile/session bad key " + d, 404 ); return; }
  if(!c) c = "anonymous";
  d = d.toLowerCase();
//  d = sanitize().xss(); // TODO ugh? can this break????

  // look up developer
  mongo.find_one_by({kind:"developer","devkey":d},function(error,results) {

    if(error || !results) { res.send("error: profile/session no key " + d,404 ); return; }

    res.send("pong");
  });

});

app.get('/profile/session', function(req,res) {

  // remote client unauthenticated callers can call this to get a client session key; this is intended to associate a given remote client with a given developer

  // when a developer instance or "client" wants to start a new session they supply the developer key and a unique client key if possible
  // we then grant them a session key

  // we could have them just submit their developer key and client key over and over of course but this lets us track session activity over time
  // this would also be a good time to capture client email and other deets

  var d = req.query["d"];
  var c = req.query["c"];
  var u = req.query["u"];

  // tidy up dat 
  if(!d) { res.send("error: profile/session bad key " + d ); return; }
  if(!c) c = "anonymous";
  if(!u) u = "0";
  d = d.toLowerCase();
//  d = sanitize().xss(); // TODO ugh? can this break????


  // look up developer
  mongo.find_one_by({kind:"developer","devkey":d},function(error,results) {

    if(error || !results) { res.send("error: profile/session no key " + d ); return; }

    // start up a new client session - with this key
    req.session.user_id = results["email"];
    req.session.devkey = d;

    var r = randomString();
    var sessionkey = crypto.createHash('md5').update(r).digest("hex");
    var created_at = new Date();
    var updated_at = new Date();

    // log the session start (asynchronously)
    var data = { kind:"log", subkind:"session", sessionkey: sessionkey, clientkey: c, devkey: d, created_at: created_at, updated_at: updated_at };
    mongo.save(data,null);
    res.send(sessionkey);

    // also remember the client if needed
    mongo.find_one_by({ kind:"client", clientkey: c, devkey: d, udid: u },function(error,results) {
      if(error) return; // cannot reply now since res.send is done
      if(!results) {
         var data = { kind:"client", clientkey: c, devkey: d, udid: u, created_at: created_at, updated_at: updated_at };
         mongo.save( data, null);
      } else {
         // TODO we could update the record
      }
    });

  });

});

app.get('/profile', check_auth, function(req,res) { res.render('profile/profile.ejs', get_state(req,res) ) });
app.get('/profile/edit', check_auth, function(req,res) { res.render('profile/edit.ejs', get_state(req,res) ) });
app.get('/profile/resign', check_auth, function(req,res) { res.render('profile/resign.ejs', get_state(req,res) ) });
app.get('/profile/analytics', check_auth, function(req,res) { res.render('profile/analytics.ejs', get_state(req,res) ) });
app.get('/profile/unitypackage', check_auth, function(req,res) { res.render('profile/unitypackage.ejs', get_state(req,res) ) });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// admin
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/admin', function(req,res) {

  mongo.find_all(function(error,results) {
    if(error) {
    } else {
      res.render('admin.ejs', { "results": results } );
    }
  });

});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// docs
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/tools', function(req,res) { res.render('tools.ejs', get_state(req,res) ) });
app.get('/docs', function(req,res) { res.render('docs.ejs', get_state(req,res) ) });
app.get('/docs/unity', function(req,res) { res.render('docs/unity.ejs', get_state(req,res) ) });
app.get('/docs/unity_tutorial', function(req,res) { res.render('docs/unity_tutorial.ejs', get_state(req,res) ) });
app.get('/docs/unity_reference', function(req,res) { res.render('docs/unity_reference.ejs', get_state(req,res) ) });
app.get('/docs/sdk', function(req,res) { res.render('docs/sdk.ejs', get_state(req,res) ) });
app.get('/docs/sdk_tutorial', function(req,res) { res.render('docs/sdk_tutorial.ejs', get_state(req,res) ) });
app.get('/docs/sdk_reference', function(req,res) { res.render('docs/sdk_reference.ejs', get_state(req,res) ) });
app.get('/docs/api', function(req,res) { res.render('docs/api.ejs', get_state(req,res) ) });
app.get('/docs/api_tutorial', function(req,res) { res.render('docs/api_tutorial.ejs', get_state(req,res) ) });
app.get('/docs/api_reference', function(req,res) { res.render('docs/api_reference.ejs', get_state(req,res) ) });


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// other
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/support', function(req,res) { res.render('support.ejs', get_state(req,res) ) });
app.get('/get_the_app', function(req,res) { res.render('get_the_app.ejs', get_state(req,res) ) });
app.get('/developer_program', function(req,res) { res.render('developer_program.ejs', get_state(req,res) ) });

app.get('/benefits', function(req,res) { res.render('benefits/benefits.ejs', get_state(req,res) ) });
app.get('/benefits/works_anywhere', function(req,res) { res.render('benefits/works_anywhere.ejs', get_state(req,res) ) });
app.get('/benefits/natural_interaction', function(req,res) { res.render('benefits/natural_interaction.ejs', get_state(req,res)) });
app.get('/benefits/cloud_platform', function(req,res) { res.render('benefits/cloud_platform.ejs', get_state(req,res)) });

app.get('/', function(req,res) { res.render('index.ejs', get_state(req,res) ); });
