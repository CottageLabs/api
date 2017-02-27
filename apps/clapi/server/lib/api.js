
// the API docs are served directly from public/docs/api/index.html
// the routes to it are handled by nginx

// This API should follow the 12 factor approach. Anything that it does that needs to be separated out should run as 
// a separate app, then this API just calls it. The control of the API to call those apps should then be handled by 
// nginx configuration on a gateway - so the API knows where the app is via the gateway, and sends requests to it. 
// Apps exposed this way should only be exposed via this API - not to the web directly (or else there is little point).
// Although some apps may have their own separate direct routes for certain functionality if necessary.

// It should only be necessary to run one API server. If more are required though, just start more. Use nginx upstream 
// groups to control which machines API calls go to. The different API endpoints could be sharded into separate upstream 
// groups so more or less machines in varying clusters can handle the loads of different API endpoints. Where API endpoints 
// herein actually point to other apps that are running on the infrastructure, the same approach should be used - any API 
// server should know to forward requests via the nginx gateway, which forwards them to the upstream group of machines 
// designated as running those apps (or the apps are guaranteed to be running on every localhost of the API server accepting 
// calls to that particular endpoint).

// there are roles and groups. Roles go in groups.
// There are also global roles. Membership of a global role works across all other groups, even if not specified.

// consider there is a user called mark, and a group called cottagelabs and a role called cottager
// mark can be added to the cottagelabs.cottager role

// To be added to roles within the group, Mark must have the cottagelabs.auth role, or be added by someone who has that role

// cascading roles can also be used, so that anyone with a role "above" the necessary role can do the action as well

// so to begin with there is no cottagelabs.auth role, so the first ever user must create it, or make the edits directly

// the first user must therefore be the root user, and have permissions to do anything

// Every group should have a public role, that anyone can join. The amount of permissions this confers can be controlled by 
// the apps that check for public role membership

// if a group has no public role, then nobody can sign up to that group - joining is controlled only by authorised users, in that case

// group controllers can create roles of any name within their group, but only those pre-existing ones in the cascading group 
// can have any sort of cascade functionality

// any new service should have a group created for it - how to restrict group creation? is group API needed sooner? If so, do group config

// TODO custom groups could be made, where a list of cascades and other features are stored for the group in question
// then the auth function could look up the group and read its configuration. That is beyond current scope though.

// new services should have a system user that the service code itself uses to access things about that service
// a system role member can add users to the group service
// which means a system account can access user data of any user by adding them to a role in the service group

// The CL API itself is defined below, with some useful supporting functions. Actual endpoints on the API should then be 
// defined in separate files under the endpoints directory, by adding routes to CLapi, and using the functions within that namespace

// api login example:
// curl -X GET "http://api.cottagelabs.com/accounts" -H "x-id: vhi5m4NJbJF7bRXqp" -H "x-apikey: YOURAPIKEYHERE"
// curl -X GET "http://api.cottagelabs.com/accounts?id=vhi5m4NJbJF7bRXqp&apikey=YOURAPIKEYHERE"

// would using this new middleware approach help with file upload in store?
// https://github.com/stubailo/meteor-rest/issues/76

CLapi = new Restivus({
  version: '',
  //apiPath: '',
  //useDefaultAuth: true,
  defaultHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
  prettyJson: true,
  auth: {
    token: 'api.keys.key', // should perhaps be hashedToken and change below to pass a hashed value instead
    user: function () {
      var u;
      var xid = this.request.headers['x-id'];
      if ( !xid ) xid = this.request.query.id;
      if ( !xid ) {
        try {
          u = Accounts.findUserByEmail(this.request.query.email);
          xid = u._id;          
        } catch (err) {}
      }
      if ( !xid ) {
        try {
          u = Accounts.findUserByUsername(this.request.query.username);
          xid = u._id;          
        } catch (err) {}
      }
      var xapikey = this.request.headers['x-apikey'];
      if ( !xapikey ) {
        try {
          xapikey = this.request.query.apikey;
        } catch(err) {}
      }
      if ( !xapikey ) { // this is for oabutton mostly, as the old oabutton system passes apikey as api_key in the request body
        try {
          xapikey = this.request.query.api_key;
        } catch(err) {}
      }
      if ( !xapikey ) {
        try {
          xapikey = this.request.body.apikey;
        } catch(err) {}
      }
      if ( !xapikey ) {
        try {
          xapikey = this.request.body.api_key;
        } catch(err) {}
      }
      if ( xid === undefined && xapikey ) {
        console.log('User providing apikey only - checking. This ability should be removed');
        try {
          u = Meteor.users.findOne({'api.keys.key':xapikey});
          xid = u._id;
        } catch(err) {}
      }

      if (!xid && !Meteor.settings.public.loginState.HTTPONLY_COOKIES && this.request.headers.cookie) {
        var name = Meteor.settings.public.loginState.cookieName + "=";
        var ca = this.request.headers.cookie.split(';');
        var cookie;
        try {
          cookie = JSON.parse(decodeURIComponent(function() {
            for(var i=0; i<ca.length; i++) {
              var c = ca[i];
              while (c.charAt(0)==' ') c = c.substring(1);
              if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
            }
            return "";
          }()));
          console.log(cookie);
          u = Meteor.users.findOne({'emails.address':cookie.email,'security.resume.token':Accounts._hashLoginToken(cookie.resume),'security.resume.timestamp':cookie.timestamp});
          if (u) {
            console.log('User authenticated by cookie with timestamped resume token');
          } else {
            u = Meteor.users.findOne({'emails.address':cookie.email,'security.fingerprint':cookie.fp,'security.resume.timestamp':cookie.timestamp});          
            if (u) console.log('User authenticated by cookie with timestamp and fingerprint');
          }
          if (u) {
            xid = u._id;
            xapikey = u.api.keys[0].key;
          } else {
            console.log('POTENTIAL COOKIE THEFT!!! ' + cookie.userId);            
          }
        } catch(err) {}
      }
      
      if ( xid === undefined ) xid = '';
      if ( xapikey === undefined ) xapikey = '';
      // TODO could add login logging here...
      if (xid) console.log('user ' + xid + ' authenticated to API with key ' + xapikey);
      if (Meteor.settings.ROOT_LOGIN_WARN && u && u.roles && u.roles.__global_roles__ && u.roles.__global_roles__.indexOf('root') !== -1) {
        console.log('root user logged in ' + xid);
        var from = this.request.headers.host !== 'dev.api.cottagelabs.com' ? 'sysadmin@cottagelabs.com' : 'alert@cottagelabs.com';
        var xf = this.request.headers['x-forwarded-for'];
        var xr = this.request.headers['x-real-ip'];
        var subject = this.request.headers.host !== 'dev.api.cottagelabs.com' ? 'api root login' : 'api root login on dev';
        subject += ' ' + xr;
        var url = this.request.url;
        var cache = [];
        var req = JSON.stringify(this.request, function(key, value) {
          if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) return;
            cache.push(value);
          }
          return value;
        },2);
        cache = null;
        CLapi.internals.mail.send({from: from, to:'mark@cottagelabs.com',subject:subject,text:'root user logged in\n\n' + u._id + '\n\n' + url + '\n\n' + xr + '\n\n' + xf + '\n\n'}); //  + req
      }
      return {
        userId: xid,
        token: xapikey // should perhaps better use Accounts._hashLoginToken(xapikey) and change which key the token is set to above
      };
    }
  }
});

// set a place to store internal methods - add a key whenever a new folder is added into the API endpoints folder
// or these can be declared in one of the files that needs them too - but useful to have here perhaps
CLapi.internals = {academic:{}, use:{}, service:{}, scripts:{}};

var moment = Meteor.npmRequire('moment');
CLapi.log = function(opts) {
  try {
    // opts must contain msg and should contain level and error, and anything else should be stored as delivered
    if (!opts.level) opts.level = 'debug';
    var loglevels = ['all','trace','debug','info','warn','error','fatal','off'];
    var loglevel = Meteor.settings.loglevel ? Meteor.settings.loglevel : 'off';
    if (loglevels.indexOf(loglevel) <= loglevels.indexOf(opts.level)) {
      opts.createdAt = Date.now();
      opts.created_date = moment(opts.createdAt,"x").format("YYYY-MM-DD HHmm");
      var today = moment(opts.createdAt,"x").format("YYYYMMDD");
      if (loglevels.indexOf(loglevel) <= loglevels.indexOf('debug')) {
        console.log(opts.created_date);
        console.log(opts.msg);
        console.log(opts.error);
      }
      // try to set some opts vars for which server the error is running on...
      try { opts.errorString = JSON.stringify(opts.error); } catch(err) {}
      try {
        CLapi.internals.es.insert('/clapi/log_'+today,opts);
      } catch(err) {
        var safer = {
          msg: opts.msg,
          level: opts.level,
          errorString: opts.errorString,
          createdAt: opts.createdAt,
          created_date: opts.created_date
        }
        try { safer.safeError = JSON.stringify(opts); } catch(err) { safer.safeIssue = 'Could not stringify all opts passed to the logger'; }
        CLapi.internals.es.insert('/clapi/log_'+today,safer);
      }
    }
  } catch (err) {
    console.log('CLAPI LOGGER IS ERRORING OUT!!!');
    console.log(err);
    console.log('CLAPI LOGGER IS ERRORING OUT!!!');
  }
}

CLapi.addRoute('/', {
  get: {
    action: function() {
      return {status:'success',data:'Cottage Labs API',docs:'Coming soon'}
    }
  }
});

// can this become a useful way to show the docs?
CLapi.addRoute('list', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi._routes ) {
        routes.push(CLapi._routes[k].path);
      }
      return routes;
      /*var replacer = function(key, value){
        if (typeof value === 'function') {
          return 'function';
        } else {
          return value;        
        }
      };
      return JSON.parse(JSON.stringify(CLapi.internals,replacer));*/
    }
  }
});
