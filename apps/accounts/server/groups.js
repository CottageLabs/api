
Meteor.publish('groupusers', function(group) {
  var f = {};
  f['roles.'+group] = {$exists:true};
  var fields = {emails:1,profile:1,roles:1};
  fields['service.'+group] = 1;
  return Meteor.users.find(f, {fields: fields });
});

Meteor.publish('groups', function() {
  return GROUPS.find();
});

Meteor.publish('requests', function() {
  return OAB_Request.find();
});
Meteor.publish('blocks', function() {
  return OAB_Blocked.find();
});

Meteor.methods({
  cauth: function(gr,user,cascade) {
    var a = CLapi.cauth(gr,user,cascade);
    console.log(a);
    return a;
  },
  addusertogroup: function(u,group,role) {
    if (role === undefined) role = 'user';
    console.log('attempt to add user ' + u + ' to group ' + group + ' in role ' + role);
    var user = Meteor.users.findOne(u);
    if (!user) user = Meteor.users.findOne({username:u});
    if (!user) user = Meteor.users.findOne({'profile.username':u});
    if (!user) user = Meteor.users.findOne({'emails.address':u});
    if (user) Roles.addUsersToRoles(user._id, role, group);
  },
  removeuserfromgroup: function(u,group,role) {
    console.log('attempt to remove user ' + u + ' from group ' + group + ' role ' + role);
    var user = Meteor.users.findOne(u);
    if (!user) user = Meteor.users.findOne({username:u});
    if (!user) user = Meteor.users.findOne({'profile.username':u});
    if (!user) user = Meteor.users.findOne({'emails.address':u});
    if (user) Roles.addUsersToRoles(user._id, role, group);
    if (user) {
      var roles = user.roles[group];
      if (role === undefined) {
        roles = [];
        var services = user.service;
        if (services[group]) {
          delete services[group];
          Meteor.users.update(user._id,{$set:{service:services}});
        }
      } else {
        var idx = roles.indexOf(role);
        if (idx > -1) roles.splice(idx,1);
      }
      Roles.setUserRoles(user._id, roles, group);
    }
  },
  inviteusertogroup: function(u,group,role) {
    if (role === undefined) role = 'user';
    var user = Meteor.users.findOne(u);
    if (!user) user = Meteor.users.findOne({username:u});
    if (!user) user = Meteor.users.findOne({'profile.username':u});
    if (!user) user = Meteor.users.findOne({'emails.address':u});
    if (user) {
      console.log('Should invite ' + user._id + ' to join ' + group + ' ' + role);
    }    
  },

  email: function(which,text) {
    var uids = OAB_Blocked.aggregate( [ { $group: { _id: "$user"}  } ] );
    var u = Meteor.users.find();
    var used = [];
    var never = [];
    u.forEach(function(usr) {
      if (uids.indexOf(usr._id) !== -1) {
        if (usr.emails && usr.emails[0] && usr.emails[0].address) used.push(usr.emails[0].address);
      } else {
        if (usr.emails && usr.emails[0] && usr.emails[0].address) never.push(usr.emails[0].address);        
      }
    });
    var addrs = which === 'used' ? used : never;
    var opts = {from:'contact@openaccessbutton.org',to:addrs,text:text};
    Clapi.internals.sendmail(opts);
  },

  userstats: function() {
    return {
      //used:used,
      //never:never,
      article: {
        blocked: OAB_Blocked.aggregate( [{$match: {type:'article'}}, { $group: { _id: "$user"}  } ] ).length,
        requested: OAB_Request.aggregate( [{$match: {type:'article'}},  { $group: { _id: "$user"}  } ] ).length
      },
      data: {
        blocked: OAB_Blocked.aggregate( [{$match: {type:'data'}}, { $group: { _id: "$user"}  } ] ).length,
        requested: OAB_Request.aggregate( [{$match: {type:'data'}},  { $group: { _id: "$user"}  } ] ).length
      }
    }
  }
});