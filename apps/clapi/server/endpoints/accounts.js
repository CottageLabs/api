
Role_requests = new Mongo.Collection("role_request");
CLapi.addCollection(Role_requests);

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
CLapi.addRoute('accounts/:id', {
  get: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      var rls = u.roles;
      if (rls && rls.__global_roles__) delete rls.__global_roles__;
      if ( CLapi.cauth('root', this.user) ) {
        // only root can get full user data
        return {status: 'success', data: u };
      } else if ( u._id === this.user._id || CLapi.cauth(u._id + '.read', this.user) ) {
        // user (or people delegated to in the user group) can get profile, roles, username, emails
        return {status: 'success', data: {profile: u.profile, roles: rls, username: u.username, emails: u.emails }}
      } else {
        // return a profile and system data for system role holders
        var ud = {profile: u.profile, roles: rls, username: u.username, emails: u.emails, system: {}};
        var authd = false;
        for ( var r in this.user.roles ) {
          if ( CLapi.cauth(r + '.system', this.user) ) {
            authd = true;
            if ( u.system[r] ) ud.system[r] = u.system[r];
          }
        }
        if ( authd ) {
          return {status: 'success', data: ud };
        } else {
          return {statusCode: 403, body:{} }
        }
      }
    }
  },
  post: {
    authRequired: true,
    action: function() {
      // TODO who should be able to write to the full user object? Which parts can be written by whom?
      // or only allow POSTing of particular parts to dedicated endpoints?
      var u = CLapi.getuser(this.urlParams.id);
      return {status: 'success', data: {} };
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      // TODO can anyone else delete, can user delete themselves, is delete an actual delete or set to disabled?
      if ( CLapi.cauth('root',this.user) ) {
        Meteor.users.remove(u._id);
        return {status: 'success', data: {} };
      // TODO certain system accounts must be able to delete system data from a user account
      } else {
        return {statusCode: 403, body:{} }
      }
    }
  }
});
CLapi.addRoute('accounts/:id/status', {
  get: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      return {status: 'success', data: {online:u.status.online, idle:u.status.idle}}
    }
  },
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
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
CLapi.addRoute('accounts/:id/profile', {
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
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
      var u = CLapi.getuser(this.urlParams.id);
      if ( u._id === this.user._id || CLapi.cauth(u._id + '.edit', this.user) ) {
        Meteor.users.update(u._id, {$set: {'profile': {} } } ); // TODO where to get the incoming request data?
        return {status: 'success', data: {profile:u.profile}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  }
});
CLapi.addRoute('accounts/:id/system/:sys', {
  post: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      if ( CLapi.cauth(this.urlParams.sys + '.system', this.user) ) {
        var sys = {};
        if ( u.system ) sys = u.system;
        if ( sys[this.urlParams.sys] === undefined ) sys[this.urlParams.sys] = {};
        for ( var k in {} ) { // TODO where to get the incoming request data?
          sys[this.urlParams.sys][k] = '';
        }
        Meteor.users.update(u._id, {$set: {'system': sys } } );
        var rsys = {system:{}};
        rsys.system[this.urlParams.sys] = sys[this.urlParams.sys];
        return {status: 'success', data: {system:rsys}}
      } else {
        return {statusCode: 403, body:{} }        
      }
    }
  },
  put: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      if ( CLapi.cauth(this.urlParams.sys + '.system', this.user) ) {
        var sys = {};
        if ( u.system ) sys = u.system;
        u.system[this.urlParams.sys] = {}; // TODO where to get the incoming request data?
        Meteor.users.update(u._id, {$set: {'system': sys } } ); 
        var rsys = {system:{}};
        rsys.system[this.urlParams.sys] = sys[this.urlParams.sys];
        return {status: 'success', data: {system:rsys}}
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
      var grp, role, ath;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      if ( grp === 'GLOBAL' ) {
        grp = Roles.GLOBAL_GROUP;
        ath = CLapi.cauth('root', this.user);
      } else {
        ath = CLapi.cauth(grp + '.auth', this.user);
        // TODO should system users be allowed to manipulate OTHER groups/roles of users in their system
        // I think not - if some system account wants to make additional groups and roles in relation to some 
        // operation of said system, and if it needs the ability to manipulate user memberships to those groups, 
        // then that external system should make its own system user account a root on those new groups that it creates.
        // So this brings up a new question: what users can create groups? Any? Or is there group control of any sort?
        if ( role === 'public' ) ath = true;
        if ( cascading.indexOf(role) !== -1 && cascading.indexOf(role) < cascading.indexOf(ath) ) ath = false;
      }
      // TODO are there groups that users (or their delegates) can assign themselves to?
      // TODO are there groups that anyone can assign anyone to? bit spammy?
      if ( ath ) {
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
      var grp, role, ath;
      var grpts = this.urlParams.grouprole.split('.');
      if (grpts.length !== 2) return {status: 'error', data: 'grouprole param must be of form group.role'}
      grp = grpts[0];
      role = grpts[1];
      if ( grp === 'GLOBAL' ) {
        grp = Roles.GLOBAL_GROUP;
        ath = CLapi.cauth('root', this.user);
      } else {
        ath = CLapi.cauth(grp + '.auth', this.user);
        if ( role === 'public' ) ath = true;
        if ( cascading.indexOf(role) !== -1 && cascading.indexOf(role) < cascading.indexOf(ath) ) ath = false;
      }
      // TODO can users remove themselves from groups? If they can, how does that affect system data in their user account?
      if ( ath ) {
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
      var u = CLapi.getuser(this.urlParams.id);
      var authd = CLapi.rcauth(this.urlParams.grouproles.split(','), u);
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
      var r = Role_requests.insert({role:role, group:grp, uid:this.userId});
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
CLapi.internals.accounts.create = function(data,opts) {
  if (data.email === undefined) throw new Error('At least email field required');
  if (data.password === undefined) data.password = Random.hexString(30);
  var userId = Accounts.createUser({email:data.email,password:data.password});
  console.log("CREATED userId = " + userId);
  // create a group for this user, that they own?
  var apikey = Random.hexString(30);
  var apihash = Accounts._hashLoginToken(apikey);
  // need checks for profile data, service data, and other special fields in the incoming data
  // update with the data that is allowed
  Meteor.users.update(userId, {$set: {'profile':{},'security':{'fingerprint':fingerprint,'httponly':!Meteor.settings.public.loginState.HTTPONLY_COOKIES}, 'api': {'keys': [{'key':apikey, 'hashedToken': apihash, 'name':'default'}] }, 'emails.0.verified': true}});
  // give first created user the root global role!
  if ( Meteor.users.find().count() === 1 ) Roles.addUsersToRoles(userId, 'root', Roles.GLOBAL_GROUP);

}
CLapi.internals.accounts.retrieve = function(uid) {
  var u = Meteor.users.findOne(uid);
  if (!u) u = Accounts.findUserByUsername(uid);
  if (!u) u = Accounts.findUserByEmail(uid);
  return u;
}
CLapi.internals.accounts.update = function(uid,keys) {
  Meteor.users.update(uid, {$set: keys});
}
CLapi.internals.accounts.delete = function(uid) {
  // need to remove anything else? groups they own?
  // does delete actually delete, or just set as disabled?
  // system accounts should never delete, should just remove system section and groups/roles
  Meteor.users.remove(uid);
}
CLapi.internals.accounts.auth = function() {}
CLapi.internals.accounts.addrole = function(uid,group,role) {
  var u = CLapi.getuser(uid);
  Roles.addUsersToRoles(u, role, group);
  return {status: 'success'};
}
CLapi.internals.accounts.removerole = function(uid,group,role) {
  var u = CLapi.getuser(uid);
  Roles.removeUsersFromRoles(u, role, group);
  return {status: 'success'};
}
CLapi.internals.accounts.allowrole = function(uid,group,role,reason) {
  CLapi.internals.accounts.addrole(uid,group,role);
  var r = Role_requests.findOne({uid:uid,group:group,role:role});
  Role_requests.remove(r);
  // TODO email the user and inform them of group added, with reason if present
  return {status: 'success'}
}
CLapi.internals.accounts.denyrole = function(uid,group,role,reason) {
  var r = Role_requests.findOne({uid:uid,group:group,role:role});
  Role_requests.update(r,{$set:{denied:true}}); // TODO should be denied date?
  // TODO email the user and inform them of group denied, with reason if present
  return {status: 'success'}  
}








