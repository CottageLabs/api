// javascript client code for managing user registration/login/logout

Handlebars.registerHelper('session', function(name) {
    return Session.get(name);
});

Template.enter_email.events({
    'submit #enter-email-form': function (e, tmpl) {
        // Don't postback
        e.preventDefault();

        var email = $('#enter-email').val().trim();
        if ( email.length === 0 ) {
            $('#enter-email').focus();
        } else {
            var loc = window.location.href;
            loc = loc.split('?')[0];
            if (loc.substring(loc.length-1) === '/') loc = loc.substring(0,loc.length-1);
            Meteor.call("enter_email",
                email,
                loc,
                function(error,result){
                if ( error ) {
                    alert("Error with that email address. Please try again.");
                    $('#enter-email').focus();
                } else {
                    Session.set("email",email);
                    Session.set("known",result.known);
                }
            });
        }
    }
});

Template.enter_email.rendered = function() {
    $('#enter-email').focus();
    watch_for_login_hashcode();
};

Template.enter_security_code.events({
    'click #reset-email': function (e, tmpl) {
        Meteor.call("cancel_login_code",Session.get("email"));
        Session.set("email",null);
    },
    'submit #enter-security-code-form': function (e, tmpl) {
        // Don't postback
        e.preventDefault();

        var code = $('#enter-security-code').val().trim();
        if ( code.length === 0 ) {
            $('#enter-security-code').focus();
        } else {
            new Fingerprint2().get(function(result, components){
                console.log(result); //a hash, representing device fingerprint
                Meteor.call("enter_security_code",Session.get("email"),code,result,function(error,pwd){
                    if ( error ) {
                        alert("That code is invalid, or has timed out. Sorry. Please try again.");
                        Meteor.call("cancel_login_code",Session.get("email"));
                        Session.set("email",null);
                    } else {
                        Meteor.loginWithPassword({email:Session.get("email").toLowerCase()},pwd);
                    }
                });
            });
        }
    }
});

// as long as we're in the login state, keep an eye out for a hashcode which means we're logging
// in - this is put here as a watcher, instead of just catching this on page reload, because on
// the iphone if an email reloads a link, and nothing put the hashcode changes, the page isn't
// going to really reload
var old_login_hashcode = "";
var hashcode_timeout = null;
function watch_for_login_hashcode(one_time_only) {

    function watcher() {
        hashcode_timeout = null;
        // if the part after # looks like one of our login URL's, then try to use it
        var hash = window.location.hash.slice(1);
        if ( hash !== old_login_hashcode ) {
            old_login_hashcode = hash;

            if ( hash.length === Meteor.settings.public.accounts.SECURITY_CODE_HASH_LENGTH ) {
                new Fingerprint2().get(function(result, components){
                    console.log(result); //a hash, representing device fingerprint
                    Meteor.call("login_via_url",hash.toUpperCase(),result,function(error,loginInfo){
                        if ( error ) {
                            // not much we can do with such an error
                        } else {
                            Meteor.loginWithPassword({email:loginInfo.email},loginInfo.pwd);
                        }
                    });
                });
            }
        }
        if ( !one_time_only ) {
            hashcode_timeout = Meteor.setTimeout(watcher,333);
        }
    }

    if ( hashcode_timeout !== null ) {
        Meteor.clearTimeout(hashcode_timeout);
    }
    watcher();
}

Template.enter_security_code.rendered = function() {
    $('#enter-security-code').focus();
    watch_for_login_hashcode();
};

Template.loggedin.username = function() {
  if ( Meteor.user().username ) {
    return Meteor.user().username;
  } else {
    return Meteor.user().emails[0].address;
  }
};

Template.loggedin.defaultapikey = function() {
  for ( var k in Meteor.user().api.keys ) {
    var dk = Meteor.user().api.keys[k];
    if ( dk.name === 'default' ) return dk.key;
  }
};

Template.loggedin.rolenames = function() {
  var keys = [];
  for ( var k in Meteor.user().roles ) {
    keys.push(k + ': ' + Meteor.user().roles[k]);
  }
  return keys;
};

Template.loggedin.events({
    'click #logout-btn': function (e, tmpl) {
        try {
          e.preventDefault();
        } catch(err) {}
        Meteor.logout();
        Session.set("email",null);
    }
});

Template.loggedin.rendered = function() {
    watch_for_login_hashcode(true); // this will cause us to stop checking
};

Meteor.startup(function() {
    watch_for_login_hashcode(true); // in case there's a hashcode at startup    
});

// check for login cookie from other CL domain
// more info including checking from non-meteor app: https://github.com/kadirahq/meteor-login-state
var logged = LoginState.get('clogins');
if ( logged && !Meteor.userId() ) {
    console.log('logging back in via cookie for user ' + logged.email);
    Meteor.call("login_via_cookie",logged.email.toLowerCase(),function(error,pwd){
        if ( !error ) {
            Meteor.loginWithPassword({email:logged.email.toLowerCase()},pwd);
        }
    });
}
