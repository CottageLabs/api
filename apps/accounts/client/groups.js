
Template.managegroup.group = function() {
  var g = GROUPS.findOne(Session.get("gid"));
  if (!g) g = {_id:Session.get("gid"),nogroup:true};
  return g;
}
/*Template.managegroup.groupusers = function() {
  return Meteor.users.find();
}*/
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

Template.managegroup.founduser = function() {
  if (Session.get('selecteduser')) {
    return Meteor.users.findOne(Session.get('selecteduser'));
  } else {
    return false;
  }
}

Template.managegroup.rendered = function() {
  Meteor.typeahead.inject();
};
Template.managegroup.helpers({
  usersearch: function() {
    return Meteor.users.find().fetch().map(function(it){ 
      var ret = '';
      if (it.username) ret += it.username;
      if (it.emails && it.emails.length > 0 ) {
        if (ret.length > 0) ret += ' - ';
        ret += it.emails[0].address;
      }
      if (ret.length === 0) ret = 'ID ' + it._id;
      return ret; 
    });
  },
  userblocks: function(uacc) {
    return OAB_Blocked.find({'user':uacc._id}).count();
  },
  userrequests: function(uacc) {
    return OAB_Request.find({'user':uacc._id}).count();    
  }
});

Template.registerHelper('searchedemail', function() {
  return Session.get("searchedemail");
});

Template.managegroup.events({
  "click #finduser": function(event) {
    Session.set('searchedemail',undefined);
    Session.set('selecteduser',undefined);
    var vs = $('#usersearch').val().split(' - ');
    var v = vs.length === 1 ? vs[0] : vs[1];
    var u = Meteor.users.findOne({'emails.address':v});
    Session.set('searchedemail',v);
    if (u === undefined) u = Meteor.users.findOne(v.replace('ID ',''));
    if (u !== undefined) Session.set('selecteduser',u._id);
  },
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
  
  "click #makeoabtestacc": function(event) {
    Meteor.call('makeoabtestacc',event.target.getAttribute('user'));
  },
  "click #unmakeoabtestacc": function(event) {
    Meteor.call('unmakeoabtestacc',event.target.getAttribute('user'));
  },

  
  "click #makepremium": function(event) {
    Meteor.call('addusertogroup',event.target.getAttribute('user'),Session.get("gid"),'premium');
  },
  "click #removepremium": function(event) {
    Meteor.call('removeuserfromgroup',event.target.getAttribute('user'),Session.get("gid"),'premium');
  },
  "change .addrole": function(event) {
    Meteor.call('addusertogroup',event.target.getAttribute('user'),Session.get("gid"),event.target.val());
  },
  "click #lanternaddquota": function(event) {
    if ( $('#lanternaddamount').val() && $('#lanternadddays').val() ) {
      Meteor.call('lanternaddquota',event.target.getAttribute('user'),parseInt($('#lanternaddamount').val()),parseInt($('#lanternadddays').val()));
      $('#lanternaddamount').val("");
      $('#lanternadddays').val("");
    }
  },
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

UI.registerHelper('isX', function(uacc,role,group) {
  if (typeof group === 'object') group = Session.get("gid");
  return group && role && uacc && uacc.roles && uacc.roles[group] && uacc.roles[group].indexOf(role) !== -1;
});

UI.registerHelper('isadmin', function(uacc,group) {
  if (typeof group === 'object') group = Session.get("gid");
  return ( (group && uacc && uacc.roles && uacc.roles[group] && uacc.roles[group].indexOf('admin') !== -1) || (uacc.roles && uacc.roles.__global_roles__ && uacc.roles.__global_roles__.indexOf('root') !== -1) );
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
  if ( _.isEmpty(Session.get('userstats')) ) {
    Meteor.call('userstats', function(err, result) {
      Session.set('userstats', result);
    });
  }
});

Template.manage_openaccessbutton.requestscount = function(status,type) {
  var filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  return OAB_Request.find(filter).count();
}
Template.manage_openaccessbutton.requestssuccesscount = function() {
  return OAB_Request.find({success:true}).count();
}
Template.manage_openaccessbutton.blockedcount = function(type) {
  var filter = {};
  if (type) filter.type = type;
  return OAB_Blocked.find(filter).count();
}
Template.manage_openaccessbutton.userstats = function() {
  return Session.get('userstats');
}
Template.manage_openaccessbutton.userblocked = function(uid) {
  return OAB_Blocked.find({user:uid}).count();
}
Template.manage_openaccessbutton.userrequested = function(uid) {
  return OAB_Request.find({user:uid}).count();
}

Template.manage_openaccessbutton.defaultapikey = function() {
  for ( var k in Meteor.user().api.keys ) {
    var dk = Meteor.user().api.keys[k];
    if ( dk.name === 'default' ) return dk.key;
  }
};

Template.manage_openaccessbutton.events({
  'click #emailusers': function() {
    $('#usersemail').val("").toggle();
    $('#sendemail').toggle();
  },
  'click #sendemail': function() {
    // TODO something...
  }
});



