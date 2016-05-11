
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
/*Meteor.publish("users", function (limit) {
  // check if there is a current user, and if that user has oabutton admin
  // if not, return nothing. If yes, return all oabutton users
  return Meteor.users.find({}, { limit: limit});
});*/
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
  setstatus: function(status,rid,text) {
    // only admin user should be able to do this
    OAB_Request.update(rid, {$set:{status:status}});
    var r = OAB_Request.findOne(rid);
    if (status === 'progress' && text !== undefined && text.length > 0) {
      // when moving status to progress, email the author
      var email = r.email;
      if (email.constructor === Array) email = email[0];
      if (email.indexOf(',') !== -1) email = email.split(',')[0];
      var opts = {from:'',to:email,text:text};
      CLapi.internals.sendmail(opts); // TODO should use own oab mail url ,Meteor.settings.openaccessbutton.mail_url);
      // should also mail the user that created the request to let them know it is in progress (or every user supporting it?)
    }
  },
  deleterequest: function(rid) {
    // only admin user should be able to do this
    OAB_Request.remove(rid);
  },
  deleteblock: function(bid) {
    // only admin user should be able to do this
    OAB_Blocked.remove(bid);
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
