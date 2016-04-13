
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

Template.managegroup.events({
  "click #adduser": function(event) {
    Meteor.call('addusertogroup',$('#newuser').val(),Session.get("gid"));
  },
  "click #inviteuser": function(event) {
    Meteor.call('inviteusertogroup',$('#newuser').val(),Session.get("gid"));
  },
  "change .addrole": function(event) {
    Meteor.call('addusertogroup',event.target.attr('user'),Session.get("gid"),event.target.val());
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

UI.registerHelper('isadmin', function(uacc,group) {
  return Meteor.call('cauth',group+'.admin',uacc);
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



Template.manage_openaccessbutton.requestscount = function() {
  return OAB_Request.find().count();
}
Template.manage_openaccessbutton.requestssuccesscount = function() {
  return OAB_Request.find({success:true}).count();
}
Template.manage_openaccessbutton.blockedcount = function() {
  return OAB_Blocked.find().count();
}


