
Template.managegroup.group = function() {
  var g = GROUPS.findOne(Session.get("gid"));
  if (!g) g = {_id:Session.get("gid"),nogroup:true};
  return g;
}
Template.managegroup.groupusers = function() {
  return Meteor.users.find();
}
Template.managegroup.userscount = function() {
  return Meteor.users.find().count();
}
Template.managegroup.rolenames = function(uacc) {
  var keys = [];
  var group = Session.get("gid");
  if (group === undefined) {
    for ( var k in uacc.roles ) {
      keys.push(k + ': ' + uacc.roles[k]);
    }
  } else if (uacc.roles[group]) {
    keys = uacc.roles[group];
  }
  return keys;
};

Template.managegroup.events({
  "click #adduser": function(event) {
    Meteor.call('addusertogroup',$('#newuser').val(),Session.get("gid"));
  },
  "click #removeuser": function(event) {
    Meteor.call('removeuserfromgroup',$('#newuser').val(),Session.get("gid"));
  },
  "click #inviteuser": function(event) {
    Meteor.call('inviteusertogroup',$('#newuser').val(),Session.get("gid"));
  },
  "click #makeadmin": function(event) {
    Meteor.call('addusertogroup',event.target.getAttribute('user'),Session.get("gid"),'admin');
  },
  "click #removeadmin": function(event) {
    Meteor.call('removeuserfromgroup',event.target.getAttribute('user'),Session.get("gid"),'admin');
  },
  "change .addrole": function(event) {
    Meteor.call('addusertogroup',event.target.getAttribute('user'),Session.get("gid"),event.target.val());
  }
});

Template.joingroup.events({
  "change #joingroup": function(event) {
    var g = $('#joingroup').val();
    if (g.length) Meteor.call('addusertogroup',$('#joingroup').attr('user'),g);
  }
});

UI.registerHelper('usergroups', function(uacc,filter) {
  if (uacc === undefined) uacc = Meteor.user();
  var u = [];
  for ( var g in uacc.roles) {
    var gg = uacc.roles[g];
    var r = {
      group: g,
      roles: gg,
      manage: false
    };
    if ( true ) r.manage = true;
    if (filter && filter === g || filter === undefined) u.push(r);
  }
  return u;
});

UI.registerHelper('isadmin', function(uacc, group) {
  if (uacc === null || uacc === undefined) return false;
  if (group === undefined) group = Session.get("gid");
  return (uacc.roles && uacc.roles[group] && uacc.roles[group].indexOf('admin') !== -1);
});

UI.registerHelper('isroot', function(uacc) {
  var group = '__global_roles__';
  return (uacc.roles && uacc.roles[group] && uacc.roles[group].indexOf('root') !== -1);
});

UI.registerHelper('userhandle', function(uacc) {
  if (uacc.username) {
    return uacc.username;
  } else if (uacc.emails && uacc.emails.length > 0 ) {
    return uacc.emails[0].address;
  } else {
    return uacc._id;
  }
});
UI.registerHelper('equals', function(x,y) {
  return x === y;
});


Template.manage_openaccessbutton.onRendered(function() {
  if ( _.isEmpty(Session.get('usersblocked')) ) {
    Meteor.call('usersblocked', function(err, result) {
      Session.set('usersblocked', result);
    });
  }
  if ( _.isEmpty(Session.get('usersrequested')) ) {
    Meteor.call('usersrequested', function(err, result) {
      Session.set('usersrequested', result);
    });
  }
});

Template.manage_openaccessbutton.requestscount = function(status) {
  var filter = {};
  if (status) filter.status = status;
  return OAB_Request.find(filter).count();
}
Template.manage_openaccessbutton.requestssuccesscount = function() {
  return OAB_Request.find({success:true}).count();
}
Template.manage_openaccessbutton.blockedcount = function() {
  return OAB_Blocked.find().count();
}
Template.manage_openaccessbutton.usersblocked = function() {
  return Session.get('usersblocked');
}
Template.manage_openaccessbutton.usersrequested = function() {
  return Session.get('usersrequested');
}
Template.manage_openaccessbutton.userblocked = function(uid) {
  return OAB_Blocked.find({user:uid}).count();
}
Template.manage_openaccessbutton.userrequested = function(uid) {
  return OAB_Request.find({user:uid}).count();
}


