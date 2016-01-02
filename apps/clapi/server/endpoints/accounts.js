
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
      var u = Meteor.users.find().count();
      return {status: 'success', data: {count:u}}
    }
  }
});
CLapi.addRoute('accounts/online', {
  get: {
    authRequired: true,
    action: function() {
      var u = Meteor.users.find({'status.online':true},{fields:{username:1,emails:1}}).fetch();
      var users = [];
      for ( var uu in u ) {
        var uuu = u[uu];
        if (uuu.username) {
          users.push(uuu.username);
        } else {
          users.push(uuu.emails[0].address);
        }
      }
      return {status: 'success', data: {count:users.length, accounts:users}}
    }
  }
});
CLapi.addRoute('accounts/online/count', {
  get: {
    action: function() {
      var u = Meteor.users.find({'status.online':true}).count();
      return {status: 'success', data: {count:u}}
    }
  }
});
CLapi.addRoute('accounts/:id', {
  get: {
    authRequired: true,
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      var rls = u.roles;
      if (rls.__global_roles__) delete rls.__global_roles__;
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
      if ( grpts.length === 1 ) {
        grp = Roles.GLOBAL_GROUP;
        role = grpts[0];
        ath = CLapi.cauth('root', this.user);
      } else {
        grp = grpts[0];
        role = grpts[1];
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
        var u = CLapi.getuser(this.urlParams.id);
        Roles.addUsersToRoles(u, role, grp);
        return {status: 'success'};
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
      if ( grpts.length === 1 ) {
        grp = Roles.GLOBAL_GROUP;
        role = grpts[0];
        ath = CLapi.cauth('root', this.user);
      } else {
        grp = grpts[0];
        role = grpts[1];
        ath = CLapi.cauth(grp + '.auth', this.user);
        if ( role === 'public' ) ath = true;
        if ( cascading.indexOf(role) !== -1 && cascading.indexOf(role) < cascading.indexOf(ath) ) ath = false;
      }
      // TODO can users remove themselves from groups? If they can, how does that affect system data in their user account?
      if ( ath ) {
        var u = CLapi.getuser(this.urlParams.id);
        Roles.removeUsersFromRoles(u, role, grp);
        return {status: 'success'};
      } else {
        return {
          statusCode: 403,
          body: {status: 'error', data: {message: 'you do not have permission to alter users in this role'} }
        };
      }
    }
  }
});
CLapi.addRoute('accounts/:id/auth/:roles', {
  get: {
    action: function() {
      var u = CLapi.getuser(this.urlParams.id);
      var authd = CLapi.rcauth(this.urlParams.roles.split(','), u);
      if ( authd ) {
        return {status: 'success', data: {auth: authd} };
      } else {
        return {statusCode: 404, body: {status: 'success', data: {auth: false} }};
      }
    }
  }
});
CLapi.addRoute('accounts/:id/request/:role', {
  post: {
    authRequired: true,
    action: function() {
      // TODO create a collection called rolerequests and record this user requesting access to this role
      // TODO find the group owner, or first auth user, or first higher auth user, and email them a link to allow the request
      return {status: 'success', data: {} };
    }
  }
});
