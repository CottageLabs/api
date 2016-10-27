
Meteor.users.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/clapi/accounts/' + this._id, doc);
});
Meteor.users.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/clapi/accounts/' + doc._id, doc);
});
Meteor.users.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/clapi/accounts/' + doc._id);
});

var Future = Npm.require('fibers/future');
loginCodes = new Meteor.Collection("logincodes");
role_request = new Mongo.Collection("role_request");
//CLapi.addCollection(loginCodes);

CLapi.addRoute('accounts', {
  get: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('root', this.user) ) {
        return {status: 'success', data: Meteor.users.find({}).fetch() };
      } else {
        return {status: 'success', data: Meteor.users.find({},{fields:{_id:1}}).fetch() };      
      }
    }
  }
});
CLapi.addRoute('accounts/token', {
  get: {
    action: function() {
      return CLapi.internals.accounts.token(this.queryParams.email,this.queryParams.location,this.queryParams.fingerprint);
    }
  },
  post: {
    action: function() {
      return CLapi.internals.accounts.token(this.request.body.email,this.request.body.location,this.request.body.fingerprint);
    }
  }
});
CLapi.addRoute('accounts/login', {
  post: {
    action: function() {
      return CLapi.internals.accounts.login(this.request.body.email,this.request.body.location,this.request.body.token,this.request.body.hash,this.request.body.fingerprint,this.request.body.resume,this.request.body.timestamp)
    }
  }
});
CLapi.addRoute('accounts/logout', {
  post: {
    action: function() {
      return CLapi.internals.accounts.logout(this.request.body.email,this.request.body.resume,this.request.body.timestamp,this.request.body.location)
    }
  }
});

CLapi.addRoute('accounts/count', {
  get: {
    action: function() {
      return {status: 'success', data: {count:CLapi.internals.accounts.count()}}
    }
  }
});
CLapi.addRoute('accounts/online', {
  get: {
    authRequired: true,
    action: function() {
      var users = CLapi.internals.accounts.online();
      return {status: 'success', data: {count:users.length, accounts:users}}
    }
  }
});
CLapi.addRoute('accounts/online/count', {
  get: {
    action: function() {
      return {status: 'success', data: {count:CLapi.internals.accounts.onlinecount()}}
    }
  }
});

CLapi.addRoute('accounts/query/count/:query', {
  get: {
    //roleRequired: 'root',
    action: function() {
      return Meteor.users.find(JSON.parse(this.urlParams.query)).count();
    }
  }
});
CLapi.addRoute('accounts/query/:query', {
  get: {
    roleRequired: 'root',
    action: function() {
      return Meteor.users.find(JSON.parse(this.urlParams.query)).fetch();
    }
  }
});

CLapi.addRoute('accounts/:id', {
  get: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      return u ? CLapi.internals.accounts.details(u._id,this.user) : {statusCode: 404, body:'404 NOT FOUND' };
    }
  },
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if (!u) {
        return {statusCode: 404, body:'404 NOT FOUND' };
      } else {
        var updated = CLapi.internals.accounts.update(u._id,this.user,this.request.body);
        return updated ? {status: 'success'} : {status: 'error'};
      }
    }
  },
  put: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if (!u) {
        return {statusCode: 404, body:'404 NOT FOUND' };
      } else {
        var updated = CLapi.internals.accounts.update(u._id,this.user,this.request.body,true);
        return updated ? {status: 'success'} : {status: 'error'};
      }
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if (!u) {
        return {statusCode: 404, body:'404 NOT FOUND' };
      } else {
        var deleted = CLapi.internals.accounts.delete(u._id,this.user,this.urlParams.service);
        return deleted ? {status: 'success'} : {status: 'error'};
      }
    }
  }
});
CLapi.addRoute('accounts/:id/status', {
  get: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      return {status: 'success', data: {online:u.status.online, idle:u.status.idle}}
    }
  },
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if ( false ) {
        // TODO this should be a route for external systems that may be using this user account
        // to just POST to this endpoint as notification that this user is doing something
        // because for external systems we cannot necessarily know the user is not idle
        // so if a POST is received here from anyone authd as the user or a system user of some sort, 
        // update the user status to ensure they are not shown as being logged out / offline / idle
        return {status: 'success', data: {}}
      } else {
        return {statusCode: 403, body:{} }
      }
    }
  }
});
// user needs to be able to update username too - or put username inside profile
// user also needs to be able to control api keys, and perhaps see / change security settings
// also need to be able to register devices for user, and see registered devices, and unregister them
/*CLapi.addRoute('accounts/:id/profile', {
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if ( u._id === this.user._id || CLapi.cauth(u._id + '.edit', this.user) ) {
        var profile = u.profile;
        if ( profile === undefined ) profile = {};
        for ( var k in {} ) { // TODO where to get the incoming request data?
          profile[k] = '';
        }
        Meteor.users.update(u._id, {$set: {'profile': profile } } );
        return {status: 'success', data: {profile:u.profile}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  },
  put: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if ( u._id === this.user._id || CLapi.cauth(u._id + '.edit', this.user) ) {
        Meteor.users.update(u._id, {$set: {'profile': {} } } ); // TODO where to get the incoming request data?
        return {status: 'success', data: {profile:u.profile}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  }
});*/

CLapi.addRoute('accounts/:id/service/:sys', {
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if ( CLapi.cauth(this.urlParams.sys + '.service', this.user) ) {
        var sys = {};
        if ( u.system ) sys = u.system;
        if ( sys[this.urlParams.sys] === undefined ) sys[this.urlParams.sys] = {};
        for ( var k in {} ) { // TODO where to get the incoming request data?
          sys[this.urlParams.sys][k] = '';
        }
        Meteor.users.update(u._id, {$set: {service: sys } } );
        var rsys = {service:{}};
        rsys.service[this.urlParams.sys] = sys[this.urlParams.sys];
        return {status: 'success', data: {service:rsys}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  },
  put: {
    authRequired: true,
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      if ( CLapi.cauth(this.urlParams.sys + '.service', this.user) ) {
        var sys = {};
        if ( u.system ) sys = u.system;
        u.system[this.urlParams.sys] = {}; // TODO where to get the incoming request data?
        Meteor.users.update(u._id, {$set: {service: sys } } ); 
        var rsys = {service:{}};
        rsys.service[this.urlParams.sys] = sys[this.urlParams.sys];
        return {status: 'success', data: {service:rsys}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  }
});

CLapi.addRoute('accounts/:id/roles/:grouprole', {
  post: {
    authRequired: true,
    action: function() {
      // group and role must not contain . or , because . is used to distinguish group from role, and comma to list them
      // what other characters should be allowed / blocked from groups and roles?
      // should group creation be constrained to groups that are separately created first via a groups API?
      var grp, role;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];

      // TODO should system users be allowed to manipulate OTHER groups/roles of users in their system
      // I think not - if some system account wants to make additional groups and roles in relation to some 
      // operation of said system, and if it needs the ability to manipulate user memberships to those groups, 
      // then that external system should make its own system user account a root on those new groups that it creates.
      // So this brings up a new question: what users can create groups? Any? Or is there group control of any sort?
      // TODO are there groups that users (or their delegates) can assign themselves to?
      // TODO are there groups that anyone can assign anyone to? bit spammy?
      var auth = CLapi.internals.accounts.auth(grp + '.auth', this.user);
      if ( role === 'public' ) auth = true;
      if ( auth ) {
        return CLapi.internals.accounts.addrole(this.urlParams.id,grp,role);
      } else {
        return {
          statusCode: 403,
          body: {status: 'error', data: {message: 'you do not have permission to alter users in this role'} }
        };
      }
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      var grp, role;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      var auth = CLapi.internals.accounts.auth(grp + '.auth', this.user);
      if ( role === 'public' ) auth = true;
      if ( auth ) {
        return CLapi.internals.accounts.removerole(this.urlParams.id,grp,role);
      } else {
        return {
          statusCode: 403,
          body: {status: 'error', data: {message: 'you do not have permission to alter users in this role'} }
        };
      }
    }
  }
});
CLapi.addRoute('accounts/:id/auth/:grouproles', {
  get: {
    action: function() {
      var u = CLapi.internals.accounts.retrieve(this.urlParams.id);
      var authd = false;
      var rset = this.urlParams.grouproles.split(',');
      for (var r in rset) {
        authd = CLapi.internals.accounts.auth(rset[r], u);
      }
      if ( authd ) {
        return {status: 'success', data: {auth: authd} };
      } else {
        return {statusCode: 404, body: {status: 'success', data: {auth: false} }};
      }
    }
  }
});
// TODO can the following request,allow,deny allow GLOBAL? or just specified groups?
CLapi.addRoute('accounts/:id/request/:grouprole', {
  post: {
    authRequired: true,
    action: function() {
      // TODO create a collection called rolerequests and record this user requesting access to this role
      // TODO find the group owner, or first auth user, or first higher auth user, and email them a link to allow the request
      // does the role they are requesting exist?
      // has the user already been denied this role? If so can they re-request or do we continue to deny?
      // if continue to deny, how can a user indicate they do want access again, when it has been decided they CAN have access?
      // e.g. if the admin says sure just re-request, it would fail. But we also don't want continuing spam requests for access after denial
      // maybe there should be a ban list for groups? Then reqeusts can just be denied, but can also be banned if desired?
      // then an unban would be required too
      var grp, role;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      var r = role_request.insert({role:role, group:grp, uid:this.userId});
      return {status: 'success', data: r };
    }
  }
});
CLapi.addRoute('accounts/:id/request/:grouprole/allow', {
  post: {
    authRequired: true,
    action: function() {
      // does the person doing this have the rights?
      var grp, role;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      var reason = this.queryParams.reason;
      if (this.data.reason) reason = this.data.reason;
      return CLapi.internals.accounts.allowrole(this.urlParams.id,grp,role,reason);
    }
  }
});
CLapi.addRoute('accounts/:id/request/:grouprole/deny', {
  post: {
    authRequired: true,
    action: function() {
      // does the person doing this have the rights?
      var grp, role;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      var reason = this.queryParams.reason;
      if (this.data.reason) reason = this.data.reason;
      return CLapi.internals.accounts.denyrole(this.urlParams.id,grp,role,reason);
    }
  }
});

// may add a route that appears to serve a gif but actually uses the gif name to check against a one-time login collection
// if the gif name matches, and the fingerprint of the device asking for it matches, serve a 1x1 gif along with the necessary 
// cookie set for the domain being called from, if that domain is within a set of allowed domains.




function generate_random_code(length,set) {
  if (length === undefined) length = Meteor.settings.public.accounts.SECURITY_CODE_HASH_LENGTH;
  if (set === undefined) set = "23456789abcdef";
  var random_hash = "";
  for ( ; random_hash.length < length; ) {
    var chr = Random.choice(set);
    if ( random_hash.length !== 0 && chr === random_hash.charAt(random_hash.length-1) ) continue;
    random_hash += chr;
  }
  return random_hash;
}

function template(str,opts) {
  for ( var k in opts ) {
    var re = new RegExp('\{\{' + k.toUpperCase() + '\}\}','g');
    str = str.replace(re,opts[k]);
  }
  return str;
}

CLapi.internals.accounts = {};

CLapi.internals.accounts.service = function(location) {
  // update this to accept settings object too, which should update the service settings
  // at which point perhaps service settings should be on mongo rather than in a text file
  // return the options for a given location
  location = location.trim('/');
  if ( login_services[location] === undefined) {
    console.log('BAD TOKEN ATTEMPT FROM ' + location);
    return false;
    // should not be logging in from a page we don't set as being able to provide login functionality. 
    // Say nothing, no explanation. Worth sending a sysadmin email?
  } else {
    var opts = {};
    for ( var o in login_services.default ) opts[o] = login_services.default[o];
    for ( var k in login_services[location] ) opts[k] = login_services[location][k];
    return opts;
  }
}

// receive a device fingerprint and perhaps some settings (e.g. to make it a registered / named device)
CLapi.internals.accounts.fingerprint = function(uid,fingerprint) {
  // TODO fingerprint should go in devices area of account, with mutliple fingerprints and useful info possible
  // for now just sets the fingerprint
  var user = CLapi.internals.accounts.retrieve(uid);
  var set = {}
  if (user.security) {
    set['security.fingerprint'] = fingerprint;    
  } else {
    set.security = {fingerprint:fingerprint}
  }
  Meteor.users.update(user._id, {$set: set});
}

// require email string, optional fingerprint string
// expect service object, containing a service key pointing to service object data
// which can contain a role - or get role from service options now?
CLapi.internals.accounts.register = function(opts) {
  if (opts.email === undefined) return false;
  // fingerprint cannot be mandatory because it can not be used easily on APIs
  var user = CLapi.internals.accounts.retrieve(opts.email);
  if ( !user ) {
    var set = { email: opts.email };
    if (opts.fingerprint) {
      //set.devices = {};
      //set.devices[opts.fingerprint] = {};
      set.security = {fingerprint:opts.fingerprint};
      // TODO should have a devices area with mutliple fingerprints and device info possible
    }
    set.service = {};
    if ( opts.service ) set.service[opts.service.service] = {profile:{}}; // TODO this should save service info if necessary
    var creds = CLapi.internals.accounts.create( set );
    user = CLapi.internals.accounts.retrieve(creds._id);
  } else {
    if (opts.fingerprint) CLapi.internals.accounts.fingerprint(user._id,opts.fingerprint);
  }
  if ( opts.service ) {
    if ( user.service === undefined ) user.service = {};
    if ( user.service[opts.service.service] === undefined ) user.service[opts.service.service] = {profile:{}};
    // TODO are there any values in service settings that should be saved into the service object on account creation?
    Meteor.users.update(user._id, {$set: {'service':user.service}});
    if (opts.service.role && ( !user.roles || !user.roles[opts.service.service] || user.roles[opts.service.service].indexOf(opts.service.role) === -1 ) ) {
      Roles.addUsersToRoles(user._id, opts.service.role, opts.service.service);
    }
  }
}

CLapi.internals.accounts.token = function(email,loc,fingerprint) {
  // check that loc is in the allowed signin locations list (can be faked, but worthwhile)
  // TODO need a check to see if the location they want to sign in to is one that allows registrations without confirmation
  // if it does not, and if the user account is not already known and with access to the requested service name, then the token should be denied
  // if this does happen, then an account request for the specified service should probably be generated somehow
  var opts = CLapi.internals.accounts.service(loc);
  if (!opts) return {};
  console.log(email + ' token request via API');
  opts.logincode = generate_random_code(Meteor.settings.LOGIN_CODE_LENGTH);
  var loginhash = generate_random_code();
  if (opts.loginurl === undefined) opts.loginurl = loc;
  opts.loginurl += "#" + loginhash;
  var until = (new Date()).valueOf() + (opts.timeout * 60 * 1000);
  opts.timeout = opts.timeout >= 60 ? (opts.timeout/60) + ' hour(s)' : opts.timeout + ' minute(s)';
  var user = CLapi.internals.accounts.retrieve(email);
  opts.action = user && CLapi.internals.accounts.auth(opts.service+'.user',user) ? "login" : "registration";
  console.log(opts);

  if (opts.action === "registration" && !opts.registration) {
    // TODO could register a registration request somehow, and then email whoever should be in charge of those for this service
    // should be a group role request, which should trigger a request email which should have an allow/deny link
    return { known:(user !== undefined), registration:opts.registration };
  } else {
    var known = false;
    if (user) {
      known = true;
    } else {
      if (!opts.role) opts.role = 'user';
      user = CLapi.internals.accounts.register({email:email,service:opts,fingerprint:fingerprint});
    }
    
    var up = {email:email,code:opts.logincode,hash:loginhash,timeout:until,service:opts.service};
    if ( fingerprint ) up.fp = fingerprint;
    loginCodes.upsert({email:email},up);

    //CLapi.internals.sendmail({ from: opts.from, to: email, subject: template(opts.subject,opts), text: template(opts.text,opts), html: template(opts.html,opts) });
    
    var snd = {from: opts.from, to: email}
    if (opts.template) {
      snd.template = {filename:opts.template,service:opts.service};
      snd.vars = {
        useremail:email,
        loginurl:opts.loginurl,
        logincode:opts.logincode
      };
    } else {
      snd.subject = template(opts.subject,opts);
      snd.text = template(opts.text,opts);
      snd.html = template(opts.html,opts);
    }
    CLapi.internals.mail.send(snd,Meteor.settings.service_mail_urls[opts.service]);

    var future = new Future(); // a delay here helps stop spamming of the login mechanisms
    setTimeout(function() { future.return(); }, 333);
    future.wait();
    return { known:known };
  }
}

CLapi.internals.accounts.login = function(email,loc,token,hash,fingerprint,resume,timestamp) {
  var opts = CLapi.internals.accounts.service(loc);
  if (!opts) return {};
  // given an email address or token or hash, plus a fingerprint, login the user
  console.log("API login for email address: " + email + " - with token: " + token + " or hash: " + hash + " or fingerprint: " + fingerprint + " or resume " + resume + " and timestamp " + timestamp);
  loginCodes.remove({ timeout: { $lt: (new Date()).valueOf() } }); // remove old logincodes
  var loginCode;
  var user;
  if (token !== undefined && email !== undefined) loginCode = loginCodes.findOne({email:email,code:token});
  if (!loginCode && fingerprint !== undefined && email !== undefined) loginCode = loginCodes.findOne( { $and: [ { email:email, fp:fingerprint } ] } );
  if (!loginCode && hash !== undefined && fingerprint !== undefined) loginCode = loginCodes.findOne( { $and: [ { hash:hash, fp:fingerprint } ] } );
  if (!loginCode && hash !== undefined) loginCode = loginCodes.findOne({hash:hash});
  if (!loginCode && email !== undefined && resume !== undefined && timestamp !== undefined) {
    console.log('searching for login via resume token');
    user = Meteor.users.findOne({'emails.address':email,'security.resume.token':resume,'security.resume.timestamp':timestamp});
  }
  var future = new Future(); // a delay here helps stop spamming of the login mechanisms
  setTimeout(function() { future.return(); }, 333);
  future.wait();
  if (loginCode || user) {
    if (email === undefined && loginCode) email = loginCode.email;
    if (fingerprint === undefined && loginCode && loginCode.fingerprint) fingerprint = loginCode.fingerprint;
    if (loginCode) loginCodes.remove({email:email}); // login only gets one chance
    if (!user) {
      CLapi.internals.accounts.register({email:email,fingerprint:fingerprint,service:{service:loginCode.service}});
      user = CLapi.internals.accounts.retrieve(email);
    }
    var newresume = generate_random_code();
    var newtimestamp = Date.now();
    Meteor.users.update(user._id, {$set: {'security.resume':{token:newresume,timestamp:newtimestamp}}});
    var service = {};
    if ( user.service[opts.service] ) {
      service[opts.service] = {};
      if (user.service[opts.service].profile) service[opts.service].profile = user.service[opts.service].profile;
      // which service info can be returned to the user account?
      // TODO should probably have public and private sections, for now has profile section, 
      // which can definitely be shared whereas nothing else cannot. Maybe that will do.      
    }
    return {
      status:'success', 
      data: {
        apikey: user.api.keys[0].key,
        account: {
          _id:user._id,
          username:user.username,
          profile:user.profile,
          roles:user.roles,
          service:service
        },
        cookie: {
          email:email,
          userId:user._id,
          roles:user.roles,
          timestamp:newtimestamp,
          url:loc,
          resume: newresume
        },
        settings: {
          path:'/',
          domain: opts.domain,
          expires: Meteor.settings.public.loginState.maxage,
          httponly: Meteor.settings.public.loginState.HTTPONLY_COOKIES,
          secure: opts.secure !== undefined ? opts.secure : Meteor.settings.public.loginState.SECURE_COOKIES
        }
      }
    }
  } else {
    return {statusCode: 401, body: {status: 'error', data:'401 unauthorized'}}
  }
}

CLapi.internals.accounts.logout = function(email,resume,timestamp,loc) {
  if ( login_services[loc] === undefined) {
    console.log('BAD LOGOUT ATTEMPT FROM ' + loc);
    return {}; // should not be logging in from a page we don't set as being able to provide login functionality. Say nothing, no explanation. Worth sending a sysadmin email?
  }
  // may want an option to logout of all sessions...
  if (email !== undefined && resume !== undefined && timestamp !== undefined) {
    var user = Meteor.users.findOne({'emails.address':email,'security.resume.token':resume,'security.resume.timestamp':timestamp});
    if (user) {
      var opts = {};
      for ( var o in login_services.default ) opts[o] = login_services.default[o];
      for ( var k in login_services[loc] ) opts[k] = login_services[loc][k];
      Meteor.users.update(user._id, {$set: {'security.resume':{}}}); // TODO what else could be thrown away here? resume tokens?
      return {status:'success',data:{domain:opts.domain}} // so far this is all that is needed to clear the user login cookie
    } else {
      return {statusCode: 401, body: {status: 'error', data:'401 unauthorized'}}
    }
  } else {
    return {statusCode: 401, body: {status: 'error', data:'401 unauthorized'}}
  }
}

CLapi.internals.accounts.count = function(filter) {
  if (filter === undefined) filter = {};
  return Meteor.users.find(filter).count()
}
CLapi.internals.accounts.online = function(filter) {
  if (filter === undefined) {
    filter = {'status.online':true};
  } else {
    if (filter.$and === undefined) filter = {$and:[filter]};
    filter.$and.push({'status.online':true});
  }
  var u = Meteor.users.find(filter,{fields:{username:1,emails:1}}).fetch();
  var users = [];
  for ( var uu in u ) {
    var uuu = u[uu];
    if (uuu.username) {
      users.push(uuu.username);
    } else {
      users.push(uuu.emails[0].address);
    }
  }
  return users;
}
CLapi.internals.accounts.onlinecount = function(filter) {
  if (filter === undefined) {
    filter = {'status.online':true};
  } else {
    if (filter.$and === undefined) filter = {$and:[filter]};
    filter.$and.push({'status.online':true});
  }
  return Meteor.users.find(filter).count();
}

// no auth control on these actions, cos any code with the ability to call them directly will also have the ability to write directly to the accounts db
// auth is handled within the API layer above, though
// create can receive the following:
// email REQUIRED
// password, apikey
// devices can be an object keyed by device fingerprint, pointing to objects containing whatever is useful about them
// service can be an object keyed by service name, pointing to objects of info about the services. 
// If role is set in the service objects, the roles will be set but not saved as part of the data
CLapi.internals.accounts.create = function(data) {
  if (data.email === undefined) throw new Error('At least email field required');
  if (data.password === undefined) data.password = Random.hexString(30);
  var userId = Accounts.createUser({email:data.email,password:data.password});
  console.log("CREATED userId = " + userId);
  // create a group for this user, that they own?
  if (data.apikey === undefined) data.apikey = Random.hexString(30);
  // need checks for profile data, service data, and other special fields in the incoming data
  var sets = {
    profile: data.profile ? data.profile : {}, // profile data, all of which can be changed by the user
    devices: data.devices ? data.devices : {}, // user devices associated by device fingerprint
    security: data.security ? data.security : {}, // user devices associated by device fingerprint
    service: {}, // services identified by service name, which can be changed by those in control of the service
    api: {
      keys: [
        {
          key: data.apikey, 
          hashedToken: Accounts._hashLoginToken(data.apikey), 
          name: 'default'
        }
      ] 
    }, 
    'emails.0.verified': true
  }
  if (data.username) sets.username = data.username;
  if (data.service) {
    for ( var s in data.service ) {
      if ( data.service[s].role ) {
        Roles.addUsersToRoles(userId, data.service[s].role, s);
        delete data.service[s].role;
      }
      sets.service[s] = data.service[s];
    }
  }
  Meteor.users.update(userId, {$set: sets});
  if ( Meteor.users.find().count() === 1 ) Roles.addUsersToRoles(userId, 'root', Roles.GLOBAL_GROUP);
  return {_id:userId,password:data.password,apikey:data.apikey};
}

CLapi.internals.accounts.retrieve = function(uid) {
  // finds and returns the full user account - NOT what should be returned to a user
  var u = Meteor.users.findOne(uid);
  if (!u) u = Accounts.findUserByUsername(uid);
  if (!u) u = Accounts.findUserByEmail(uid);
  if (!u) u = Meteor.users.findOne({'api.keys.key':uid});
  return u;
}

CLapi.internals.accounts.details = function(uid,user) {
  // controls what should be returned about a user account based on the permission of the account asking
  // this is for use via API access - any code with access to this lib on the server could just call accounts directly to get everything anyway
  var uacc = user._id === uid ? user : CLapi.internals.accounts.retrieve(uid);
  var ret = {};
  if ( CLapi.cauth('root', user) ) {
    // any administrative account that is allowed full access to the user account can get it here
    ret = uacc;
  } else if (user._id === uacc._id || CLapi.cauth(uacc._id + '.read', user) ) {
    // this is the user requesting their own account - they do not get everything
    // a user should also have a group associated to their ID, and anyone with read on that group can get this data too
    ret._id = uacc._id;
    ret.profile = uacc.profile;
    ret.username = uacc.username;
    ret.emails = uacc.emails;
    ret.security = uacc.security; // this is security settings and info
    ret.api = uacc.api;
    ret.roles = uacc.roles;
    ret.status = uacc.status;
    if (uacc.service) {
      ret.service = {};
      for ( var s in uacc.service ) {
        if ( uacc.service[s].profile ) ret.service[s] = {profile: uacc.service[s].profile}
      }
    }
  } else if (uacc.service) {
    for ( var r in uacc.service ) {
      if ( CLapi.cauth(r + '.service', user) ) {
        ret._id = uacc._id;
        ret.profile = uacc.profile;
        ret.username = uacc.username;
        ret.emails = uacc.emails;
        ret.roles = uacc.roles; // should roles on other services be private?
        ret.status = uacc.status;
        ret.service = {}
        ret.service[r] = uacc.service[r];
        return ret;
      }
    }
  }
  return ret;
}

CLapi.internals.accounts.update = function(uid,user,keys,replace) {
  // account update does NOT handle emails, security, api, or roles
  var uacc = user._id === uid ? user : CLapi.internals.accounts.retrieve(uid);
  var allowed = {};
  if ( user._id === uacc._id || CLapi.cauth(uacc._id + '.edit', user) || CLapi.cauth('root', user) ) {
    // this is the user requesting their own account, or anyone with edit access on the group matching the user account ID
    // users can also edit the profile settings in a service they are a member of, if that service defined a profile for its users
    if (keys.username) allowed.username = keys.username
    if ( replace ) {
      if ( keys.profile ) allowed.profile = keys.profile;
      if ( keys.service ) {
        for ( var k in keys.service ) {
          if ( keys.service[k].profile ) allowed['service.'+k+'.profile'] = keys.service[k].profile
        }
      }
    } else {
      if ( keys.profile ) {
        for ( var kp in keys.profile ) allowed['profile.'+kp] = keys.profile[kp];
      }
      if ( keys.service ) {
        for ( var ks in keys.service ) {
          if ( keys.service[ks].profile ) {
            for ( var kk in keys.service[ks].profile ) allowed['service.'+ks+'.profile.'+kk] = keys.service[ks].profile[kk];
          }
        }
      }
    }
    if ( CLapi.cauth('root', user) ) {
      // the root user could also set a bunch of other things perhaps
    }
    Meteor.users.update(uid, {$set: allowed});
    return true;
  } else if ( uacc.service ) {
    for ( var r in uacc.service ) {
      if ( CLapi.cauth(r + '.service', user) && keys.service && keys.service[r] ) {
        // can edit this service section of the user account
        if (replace) {
          allowed['service.'+r] = keys.service[r];        
        } else {
          allowed['service.'+r] = {}
          // TODO this will not loop down levels at all - so could overwrite stuff in an object, for example
          for ( var kr in keys.service[r] ) allowed['service.'+r+'.'+kr] = keys.service[r][kr];
        }
        Meteor.users.update(uid, {$set: allowed});
        return true;
      }
    }
  }
  return false;
}

CLapi.internals.accounts.delete = function(uid,user,service) {
  // need to remove anything else? groups they own?
  // does delete actually delete, or just set as disabled?
  // service accounts should never delete, should just remove service section and groups/roles
  if ( CLapi.internals.accounts.auth('root',user) ) {
    console.log('TODO accounts API should delete user ' + uid);
    //Meteor.users.remove(uid);
    return true;
  } else {
    return false;
  }
}

CLapi.internals.accounts.auth = function(gr,user,cascade) {
  if ( gr.split('.')[0] === user._id ) return 'root'; // any user is effectively root on their own group - which matches their user ID
  if ( !user.roles ) return false; // if no roles can't have any auth, except on own group (above)
  // override if user has global root always return true
  if ( user.roles.__global_roles__ && user.roles.__global_roles__.indexOf('root') !== -1 ) {
    console.log('user ' + user._id + ' has role root');
    return 'root';
  }
  // otherwise get group and role from gr or assume global role
  var role, grp;
  var rp = gr.split('.');
  if ( rp.length === 1 ) {
    grp = '__global_roles__';
    role = rp[0];
  } else {
    grp = rp[0];
    role = rp[1];
  }
  // check if user has group role specified
  if ( user.roles[grp] && user.roles[grp].indexOf(role) !== -1 ) {
    console.log('user ' + user._id + ' has role ' + gr);
    return role;
  }
  // or else check for higher authority in cascading roles for group
  // TODO ALLOW CASCADE ON GLOBAL OR NOT?
  // cascading roles, most senior on left, allowing access to all those to the right
  var cascading = ['root','service','super','owner','admin','auth','publish','edit','read','user','info','public'];
  if ( cascade === undefined ) cascade = true;
  if ( cascade ) {
    var ri = cascading.indexOf(role);
    if ( ri !== -1 ) {
      var cascs = cascading.splice(0,ri);
      for ( var r in cascs) {
        var rl = cascs[r];
        if ( user.roles[grp] && user.roles[grp].indexOf(rl) !== -1 ) {
          console.log('user ' + user._id + ' has cascaded role ' + grp + '.' + rl + ' overriding ' + gr);
          return rl;
        }
      }
    }
  }
  // otherwise user fails role check
  console.log('user ' + user._id + ' does not have role ' + gr);
  return false;
}

CLapi.internals.accounts.addrole = function(uid,group,role) {
  var uacc = CLapi.internals.accounts.retrieve(uid);
  Roles.addUsersToRoles(uacc, role, group);
  return {status: 'success'};
}

CLapi.internals.accounts.removerole = function(uid,group,role) {
  var uacc = CLapi.internals.accounts.retrieve(uid);
  Roles.removeUsersFromRoles(uacc, role, group);
  // remove the related service data here?
  return {status: 'success'};
}

CLapi.internals.accounts.allowrole = function(uid,group,role,reason) {
  // ensure the person allowing has the right to do so
  CLapi.internals.accounts.addrole(uid,group,role);
  role_request.remove({uid:uid,group:group,role:role});
  // TODO email the user and inform them of group added, with reason if present
  return {status: 'success'}
}

CLapi.internals.accounts.denyrole = function(uid,group,role,reason) {
  var r = role_request.findOne({uid:uid,group:group,role:role});
  role_request.update(r,{$set:{denied:true}}); // TODO should be denied date?
  // TODO email the user and inform them of group denied, with reason if present
  return {status: 'success'}  
}








