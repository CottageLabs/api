// login state cookies across subdomains taken from kadira, but we use custom cookies 
// fur further auth with serials and hashes, so have our own custom loginstate code
// https://github.com/kadirahq/meteor-login-state

// login state cookies across subdomains taken from kadira, but we use custom cookies 
// fur further auth with serials and hashes, so have our own custom loginstate code
// https://github.com/kadirahq/meteor-login-state

LoginState = {};

var setCookie = function(name, value, options) {
    options = options || {};

    if (!options.raw) value = encodeURIComponent(String(value));

    var text = name + '=' + value;

    // expires
    var date = options.expires;
    if (typeof date === 'number') {
        date = new Date();
        date.setDate(date.getDate() + options.expires);
    }
    if (date instanceof Date) text += '; expires=' + date.toUTCString();

    // domain
    if (typeof options.domain === 'string' && options.domain !== '') text += '; domain=' + options.domain;

    // path
    if (typeof options.path === 'string' && options.path !== '') text += '; path=' + options.path;

    // secure
    if (options.secure) text += '; secure';

    // httponly
    if (options.httponly) text += '; HttpOnly';

    document.cookie = text;
    return text;
};

Meteor.startup(function() {
  var config = Meteor.settings && Meteor.settings.public && 
    Meteor.settings.public.loginState;

  if(config) {
    LoginState.init(config.domain, config.cookieName, config.maxage);
  }
});

LoginState.init = function(domain, cookieName, maxage) {
  if(typeof domain == "undefined") {
    throw new Error("domain is required for login-state");
  }

  cookieName = cookieName || "meteor-login-state";
  maxage = maxage || 365; // TODO also allow user config of max age so check user.profile.security.cookiemaxage

  Tracker.autorun(function() {
    var user = Meteor.user && Meteor.user();
    if(user) {
      var data = {
        email: user.emails && user.emails[0] && user.emails[0].address,
        timestamp: Date.now(),
        userId: user._id,
        url: window.location.origin
      };
      new Fingerprint2().get(function(result, components){
        console.log(result); //a hash, representing device fingerprint
        data.fp = result;
        // allow setting login cookies on multiple domains
        var domains = Meteor.settings.public.loginState.EXTRA_DOMAINS;
        domains.push(Meteor.settings.public.loginState.domain);
        // this and the else code below should actually just check if on one of the allowed domains and set cookie for that domain
        // setting for other domains does not succeed anyway. But tat this point we could trigger a visit to a pixel img url that would
        // set across all domains we want (if that user has login rights on that site...)
        for ( var d in domains ) {
          setCookie(cookieName, JSON.stringify(data), {
            path: "/",
            expires: maxage,
            domain: domains[d],
            httponly: Meteor.settings.public.loginState.HTTPONLY_COOKIES && !(user.profile && user.profile.security && !user.profile.security.httponly),
            secure: Meteor.settings.public.loginState.SECURE_COOKIES
          });
        }
      });

    } else {
      // allow setting login cookies on multiple domains
      var domains = Meteor.settings.public.loginState.EXTRA_DOMAINS;
      domains.push(Meteor.settings.public.loginState.domain);
      for ( var d in domains ) {
        setCookie(cookieName, "", {
          path: "/",
          expires: -1,
          domain: domains[d]
        });
      }
    }
  });

  LoginState.init = function() {};
};

LoginState.get = function(cookieName) {
  var loginState = getCookie(cookieName);
  if(loginState) {
    return JSON.parse(decodeURIComponent(loginState));
  } else {
    return false;
  }
};

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1);
      if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
  }
  return "";
}

if(typeof module !== "undefined") {
  module.exports = LoginState;
} else {
  window.LoginState = LoginState;
}