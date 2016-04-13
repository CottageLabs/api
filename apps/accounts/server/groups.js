
Meteor.publish('groupusers', function(group) {
  var f = {};
  f['roles.'+group] = {$exists:true};
  return Meteor.users.find(f, {fields: {"emails": 1, "profile": 1, "roles": 1, "service": 1} });
});

Meteor.publish('groups', function() {
  return GROUPS.find();
});

Meteor.methods({
  cauth: function(gr,user,cascade) {
    return CLapi.cauth(gr,user,cascade);
  },
  addusertogroup: function(u,group,role) {
    console.log('attempt to add user');
    if (role === undefined) role = 'user';
    var user = Meteor.users.findOne(u);
    if (!user) user = Meteor.users.findOne({username:u});
    if (!user) user = Meteor.users.findOne({'profile.username':u});
    if (!user) user = Meteor.users.findOne({'emails.address':u});
    if (user) Roles.addUsersToRoles(user._id, role, group);
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
  }
});