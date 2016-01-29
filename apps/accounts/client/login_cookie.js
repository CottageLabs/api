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
  maxage = maxage || 365;

  Tracker.autorun(function() {
    var user = this.user && this.user();
    if(user) {
      var data = {
        // in here should provide some sort of hash to check the user with
        // and also httponly or not, depending on app configurations and user account choice
        timestamp: Date.now(),
        //username: user.username,
        userId: user._id,
        //email: user.emails && user.emails[0] && user.emails[0].address,
        url: window.location.origin
      };

      setCookie(cookieName, JSON.stringify(data), {
        path: "/",
        expires: maxage,
        domain: domain
      });
    } else {
      setCookie(cookieName, "", {
        path: "/",
        expires: -1,
        domain: domain
      });
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