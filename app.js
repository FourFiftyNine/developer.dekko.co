
//////////////////////////////////////////////////////////////////////////////////
// node.js expressjs app for dekko developer and user session management
//////////////////////////////////////////////////////////////////////////////////

var express  = require('express');
// var ejs   = require('ejs');
var jade     = require('jade');
var stylus   = require('stylus');
var nib      = require('nib'); // CSS3 mixin library
var S        = require('string'); // Utility Class http://stringjs.com/
var routes   = require('./routes');
var MongoDB  = require('./mongo').MongoDB;
var crypto   = require('crypto');
var bcrypt   = require('bcrypt');
var check    = require('validator').check;
var sanitize = require('validator').sanitize;
var Step     = require('step');
// var passport = require('passport') , LocalStrategy = require('passport-local').Strategy;
// var sendmail = require('sendmail').sendmail;

var mail = require('mail').Mail({
  host: 'smtp.gmail.com',
  username: 'anselm@dekko.co',
  password: '34west34'
});

//////////////////////////////////////////////////////////////////////////////////
// configure express js
//////////////////////////////////////////////////////////////////////////////////

var app = module.exports = express.createServer();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "dekko world" }));
  // app.use(passport.initialize());
  // app.use(passport.session());
  app.use(express.methodOverride());

  app.use(require('stylus').middleware({
      src: __dirname + '/views',
      dest: __dirname + '/public',
      debug: true,
      compile: compile
  }));

  // use nib + debug options
  function compile(str, path) {
    return stylus(str)
      .set('linenos', true)
      .set('filename', 'public/css/style.css')
      .use(nib())
      .import('nib');
  }

  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.configure('production', function() {
  app.use(express.errorHandler());
});


//////////////////////////////////////////////////////////////////////////////////
// campaign support - not used yet
//////////////////////////////////////////////////////////////////////////////////

// api.campaigns({ start: 0, limit: 25 }, function (data) {
//     if (data.error)
//         console.log('Error: '+data.error+' ('+data.code+')');
//     else
//         console.log(JSON.stringify(data)); // Do something with your data!
// });

// api.campaignStats({ cid : '/* CAMPAIGN ID */' }, function (data) {
//     if (data.error)
//         console.log('Error: '+data.error+' ('+data.code+')');
//     else
//         console.log(JSON.stringify(data)); // Do something with your data!
// });

//////////////////////////////////////////////////////////////////////////////////
// dynamic helpers for page variables
//////////////////////////////////////////////////////////////////////////////////

app.dynamicHelpers({

session: function(req, res){
  return req.session;
},

locals: function(req,res) {

  // TODO this should not be recomputed each time it is called

  var header_navigation = {
    login: {
      uri : '/login',
      url : 'login',
      title : 'login',
      isActive: S(req.route.path).contains('login')
    }
  };

  if(req.session && req.session.user_id) {
    header_navigation["login"] = {
      uri : '/logout',
      url : 'logout',
      title : 'logout',
      isActive: S(req.route.path).contains('login')
    }
  }; 

  var features_navigation = {
    works_anywhere: {
      uri : '/features/works-anywhere',
      url : 'works-anywhere',
      title : 'works anywhere',
      isActive: S(req.route.path).contains('works-anywhere')
    },
    feels_natural: {
      uri : '/features/feels-natural',
      url : 'feels-natural',
      title : 'feels natrual',
      isActive: S(req.route.path).contains('feels-natural')
    },
    cloud_platform: {
      uri : '/features/cloud-platform',
      url : 'cloud-platform',
      title : 'cloud platform',
      isActive: S(req.route.path).contains('cloud-platform')
    }
  };

  var locals = {
    show_signup: req.hide_signup ? 0 : 1,
    user_message_status: req.user_message_status,
    user_message_error: req.user_message_error, 
    body_class: (req.route.path === '/') ? 'home' : S(req.route.path).replaceAll('/', ' ').ltrim().s,
    header_navigation: header_navigation,
    features_navigation: features_navigation
  };

  // css selector cannot start with an integer
  // TODO change up with error handling is implemented
  if(locals.body_class == "404") locals.body_class = "error-404";

  return locals;
},


user_id: function(req, res) {
  if(req.session && req.session.user_id) {
    return req.session.user_id;
  }
  return null;
},

devkey: function(req,res) {
  if(req.session && req.session.user_id) {
    return req.session.devkey;
  }
  return null;
},

recent_activity: function(req,res) {
  return req.recent_activity ? req.recent_activity : [];
},

email: function(req,res) {
  if (req.body && req.body["email"]) return req.body["email"];
  return "";
}

}); // end

function user_message_status(req,msg) {
  req.user_message_status = msg;
}

function user_message_error(req,msg) {
  req.user_message_error = msg;
}

////////////////////////////////////////////////////////////////////////////////
// database go!
////////////////////////////////////////////////////////////////////////////////

var mongo = new MongoDB('127.0.0.1',27017);

////////////////////////////////////////////////////////////////////////////////
// utility methods
////////////////////////////////////////////////////////////////////////////////

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

//
// render profile state
//
//

function perform_profile(req,res) {
  mongo.find_all_by({ kind:"log", subkind:"facebook", devkey:req.session.devkey },function(error,results) {
    if(error) return res.send("internal problem");
    req.recent_activity = results;
    res.render('profile/profile');
  });
}

//
// render stats
//
//

function perform_stats(req,res) {

  var developers = 0;
  var users = 0;
  var sessions = 0;

  Step(
    function step1() {
      mongo.count_all_by({ kind:"developer" },this);
    },
    function step2(err,results) {
      developers = results;
      mongo.count_all_by({ kind:"client" },this);
    },
    function step3(err,results) {
      users = results;
      mongo.count_all_by({ kind:"log", subkind:"facebook" },this);
    },
    function step4(err,results) {
      sessions = results;
      res.render('stats',{locals:{developers:developers,users:users,sessions:sessions}});
    }
  );

}

//
//
// do a login
//
// TODO javascript client side dynamic validation of email would be nice too as well as error checking client side
//

function perform_login_signup(req,res,create_account) {
  var post = req.body;
  var email = post.email;
  var organization = post.organization;
  var password = post.password;

  // TODO prefer not to have to do this explicitly; research how to find current page
  var target = create_account ? "profile/sign-up" : "profile/login";

  // do some trivial validation here - although client does most of this in javascript already - pass no hints back!
  if (!email || !password || !validateEmail(email)) {
    user_message_status(req,error_message_noauth);
    res.render(target);
    return;
  }

  console.log("sign-up: looking for " + email );
  email = sanitize(email).xss();
  password = sanitize(password).xss();
  //var salt = 'salty sardines'; // bcrypt.gen_salt_sync(10);
  //var hash = bcrypt.encrypt_sync(password, salt);
  var hash = password; // TODO BAD! we MUST salt and hash

  // does this account exist?
  mongo.find_one_by({ "email":email},function(error,results) {

    // internal error
    if(error) { user_message_status(error_message_2); res.render(target); return; }

    // a user was found
    if(results) {

      // if this is a create request then fail - pass back no hints
      if(create_account) {
        user_message_status(req,error_message_noauth);
        res.render(target);
        return;
      }

      // this is a login request - try perform it
      if(results["password"] && results["password"] == hash) { // if(bcrypt.compare_sync(results["password"],hash)) {
        req.session.user_id = results["email"];
        req.session.devkey = results["devkey"];
        res.redirect('/profile');
        return;
      }

      // this is a failed login - pass back no hints
      user_message_status(req,error_message_noauth);
      res.render(target);
      return;
    }

    // not finding a user and not being create is a fail - pass back no hints
    if(!create_account) {
      user_message_status(req,error_message_noauth);
      res.render(target);
      return;
    }

    // this is a signup for a new user
    console.log("sign-up: adding new ");
    var created_at = new Date();
    var updated_at = new Date();
    var devkey = crypto.createHash('md5').update(email).digest("hex");
    var data = { kind: "developer", devkey: devkey, organization: organization, email: email, password: hash, created_at: created_at, updated_at: updated_at };
    console.log("sign-up: saving " + data );
    mongo.save( data, function( error, results) {

      // internal error
      if(error) { user_message_status(error_message_2); res.render(target); return; }

      // success
      console.log("sign-up: saved user");
      var session = req.session;
      req.session.user_id = email;
      req.session.devkey = devkey;
      res.redirect('/profile');
    });
  });
}

function perform_recover_password(req,res) {

  var post = req.body;
  var email = post.email;

  if (!email || !validateEmail(email)) {
    user_message_status(req,"Email address not found");
    res.render("profile/recover");
    return;
  }

  console.log("recover: looking for " + email );
  email = sanitize(email).xss();

  mongo.find_one_by({ "email":email},function(error,results) {
    if(error) { user_message_status(error_message_2); res.render(target); return; }
    if(results) {
      var password = results["password"];

      mail.message({
        from: 'anselm@dekko.co',
        to: [email],
        subject: 'Your password'
      })
      .body(password)
      .send(function(err) {
        if (err) throw err;
        console.log('Sent!');
      });
      console.log("Sending out email to " + email );
      res.render('profile/recovered');
    } else {
      user_message_status(req,"Email address not found");
      res.render("profile/recover");
    }
  });

}

//
// log facebook details if we have them
// TODO security

function perform_session_facebook(req,res) {

  var blob = req.body;

  var email      = blob["email"];
  var name       = blob["name"];
  var fbid       = blob["fbid"];
  var devkey     = blob["devkey"];
  var art        = blob["art"];
  var sessionkey = blob["sessionkey"];
  var created_at = new Date();
  var updated_at = new Date();

  console.log("server got a new facebook session devkey=" + devkey + " name=" + name + " email=" + email + " fbid=" + fbid );

  var data = { kind:"log", subkind:"facebook", art:art, devkey: devkey, email:email, name:name, fbid:fbid, created_at: created_at, updated_at: updated_at };
  mongo.save(data,function(error,results) { console.log("server::session::facebook done " + results ); } );


//  mongo.find_one_by({kind:"developer","devkey":d},function(error,results) {
//    if(error || !results) { res.send("error: profile/session no key " + d ); return; }
//  });

  res.send("thanks");
}

//
// log session starts and grant session key
//
// remote client unauthenticated callers can call this to get a client session key; this is intended to associate a given remote client with a given developer
//
// when a developer instance or "client" wants to start a new session they supply the developer key and a unique client key if possible
// we then grant them a session key
//
// TODO debate - we could have them just submit their developer key and client key over and over of course but this lets us track session activity over time
// this would also be a good time to capture client email and other deets
//

function perform_session(req,res) {
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

}

////////////////////////////////////////////////////////////////////////////////
// authentication - using a diy approach for now so this is unused
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
// expressjs go!!!
//////////////////////////////////////////////////////////////////////////////////

app.listen(8002);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// error messages - trying to keep them all in one place
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

var error_message_noauth =       'I did not get enough information to help you - perhaps you need to [recover](/profile/recover) a lost password or email?';
var error_message_2 =            'Sign-on internal error #2';
var error_message_3 =            'Sign-on internal error #3';
var error_message_client_login = 'Client internal error #3';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// routes for session and profile sign-up, login and management overall for developers and session playing clients
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

// stats
app.get('/stats',                function(req,res) { req.hide_signup = 1; perform_stats(req,res); });

// login routes
app.get('/login',                function(req,res) { res.render('profile/login' ); });
app.get('/profile/login',        function(req,res) { res.render('profile/login' ); });

// recover password routes

app.get('/recover',              function(req,res) { req.hide_signup = 1; res.render('profile/recover' ); });
app.get('/profile/recover',      function(req,res) { req.hide_signup = 1; res.render('profile/recover' ); });
app.get('/recovered',            function(req,res) { res.hide_signup = 1; res.render('profile/recovered'); });
app.post('/recover',             function(req,res) { req.hide_signup = 1; perform_recover_password(req,res); });

// view profile

app.get('/profile',              check_auth, function(req,res) { perform_profile(req,res); });
app.get('/profile/edit',         check_auth, function(req,res) { res.render('profile/edit' ); });
app.get('/profile/resign',       check_auth, function(req,res) { res.render('profile/resign' ); });
app.get('/profile/analytics',    check_auth, function(req,res) { res.render('profile/analytics' ); });
app.get('/profile/unitypackage', check_auth, function(req,res) { res.render('profile/unitypackage' ); });

// sign in out up session stuff 

app.post('/profile/login',    function(req,res) { perform_login_signup(req,res,0);          });
app.post('/profile/sign-up',  function(req,res) { perform_login_signup(req,res,1);          });

app.get('/signup',            function(req,res) { res.render('profile/sign-up' );           });
app.get('/sign-up',           function(req,res) { res.render('profile/sign-up' );           });
app.get('/profile/sign-up',   function(req,res) { res.render('profile/sign-up' );           });

app.get('/profile/signout',   function(req,res) { req.session.destroy(); res.redirect("/"); });
app.get('/signout',           function(req,res) { req.session.destroy(); res.redirect("/"); });
app.get('/logout',            function(req,res) { req.session.destroy(); res.redirect("/"); });

// transitive sessions for iphone clients

app.post('/session/facebook',        function(req,res) { perform_session_facebook(req,res); });
app.get('/session/facebook',         function(req,res) { perform_session_facebook(req,res); });
app.get('/session',                  function(req,res) { perform_session(req,res);          });
app.get('/profile/session/facebook', function(req,res) { perform_session_facebook(req,res); });
app.get('/profile/session',          function(req,res) { perform_session(req,res);          });

//
//  server ping alive test - unused
//
/*
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
*/

/////////////////////////////////////////////////////////
// page handling - some unused reference json code
///////////////.//////////////////////////////////////////////////////////////////

// test json
/*
app.get('/json0', function(req, res){
  mongo.find_all(function(error, results){ res.send(results); });
});

app.get('/json1/:id', function(req, res) {
  mongo.find_one_by_id(req.params.id, function(error, developer) {
    res.render('json', { locals: { developer:developer } });
  });
});

app.get('/json2/:id', function(req,res) {
  mongo.find_one_by_id(req.params.id, function(error, developer) {
    res.send(developer);
  });
});
*/

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// docs
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/tools', function(req,res) { res.render('tools' ); });
app.get('/docs', function(req,res) { res.render('docs' ); });
app.get('/docs/unity', function(req,res) { res.render('docs/unity'); });
app.get('/docs/unity_tutorial', function(req,res) { res.render('docs/unity_tutorial'); });
app.get('/docs/unity_reference', function(req,res) { res.render('docs/unity_reference' ); });
app.get('/docs/sdk', function(req,res) { res.render('docs/sdk' ); });
app.get('/docs/sdk_tutorial', function(req,res) { res.render('docs/sdk_tutorial' ); });
app.get('/docs/sdk_reference', function(req,res) { res.render('docs/sdk_reference' ); });
app.get('/docs/api', function(req,res) { res.render('docs/api' ); });
app.get('/docs/api_tutorial', function(req,res) { res.render('docs/api_tutorial' ); });
app.get('/docs/api_reference', function(req,res) { res.render('docs/api_reference' ); });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// other
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/support', function(req,res) { res.render('support' ); });
app.get('/get_the_app', function(req,res) { res.render('get_the_app' ); });
app.get('/developer_program', function(req,res) { res.render('developer_program' ); });

// Features
app.get('/features', function(req,res) { res.render('features/works_anywhere' ); });
app.get('/features/works-anywhere', function(req,res) { res.render('features/works_anywhere' ); });
app.get('/features/feels-natural', function(req,res) { res.render('features/feels_natural' ); });
app.get('/features/cloud-platform', function(req,res) { res.render('features/cloud_platform' ); });
app.get('/', function(req,res) { res.render('index' ); });
app.get('/404', function(req, res) { res.render('404' ); });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// admin
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/admin', function(req,res) {
  mongo.find_all(function(error,results) {
    if(error) return;
    res.render('admin', { "results": results } );
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// mail
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Mailchimp email submit
// TODO separate out into helper module?
app.get('/mailchimp_submit', function(req, res) {
  var MailChimpAPI = require('mailchimp').MailChimpAPI;
  // Create enviromental aware configration options
  var api_key = 'a2c240e07acd58ee7b00c2ea9b4751af-us4'; // my test api key
  var list_id = '23fa1605c3'; // My test email list

  try { 
      var api = new MailChimpAPI(api_key, { version : '1.3', secure : false });
  } catch (error) {
      console.log('Error: ' + error);
  }

  api.listSubscribe({
    id: list_id, 
    email_address: req.query.email}, 
    function (data) {
      if (data.error) {
        res.send(data);
      } else {
        res.send(data);
      }
  });
})

