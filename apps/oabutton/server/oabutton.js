
Meteor.publish("requests", function () {
  return OAB_Request.find();
});
Meteor.publish("blocked", function (limit) {
  return OAB_Blocked.find({}, { limit: limit });
});
Meteor.publish("block", function (bid) {
  return OAB_Blocked.find(bid);
});
Meteor.publish("requestrelatedtoblock", function (bid) {
  var b = OAB_Blocked.findOne(bid);
  return OAB_Request.find({url:b.url});
});
Meteor.publish("users", function (limit) {
  // check if there is a current user, and if that user has oabutton admin
  // if not, return nothing. If yes, return all oabutton users
  return Meteor.users.find({}, { limit: limit});
});
Meteor.publish("request", function (rid) {
  return OAB_Request.find(rid);
});
Meteor.publish("blockedforurl", function (url) {
  return OAB_Blocked.find({url:url});
});
Meteor.publish("userblocked", function (uid,limit) {
  return OAB_Blocked.find({user:uid}, {limit:limit});
});

Meteor.methods({
  addblocked: function(event) {
    OAB_Blocked.insert(event);
  },
  setprofession: function(uid,profession) {
    Meteor.users.update(uid,{$set:{'service.openaccessbutton.profession':profession}});  
  },
  setusername: function(uid,username) {
    var exists = Meteor.users.findOne({username:username});
    if (exists) {
      return false;
    } else {
      Meteor.users.update(uid,{$set:{username:username}});
      return true;
    }
  },
  confirmpublic: function(uid) {
    Meteor.users.update(uid,{$set:{'service.openaccessbutton.confirm_public':true}});
  },
  confirmterms: function(uid) {
    Meteor.users.update(uid,{$set:{'service.openaccessbutton.confirm_terms':true}});
  },
  mailinglist: function(uid) {
    Meteor.users.update(uid,{$set:{'service.openaccessbutton.mailing_list':true}});
  }
});
