
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
Meteor.publish("request", function (rid,receiver) {
  if (rid) {
    return OAB_Request.find(rid);
  } else {
    return OAB_Request.find({receiver:receiver});
  }
});
Meteor.publish("blockedforurl", function (url) {
  return OAB_Blocked.find({url:url});
});
Meteor.publish("userblocked", function (uid) {
  return OAB_Blocked.find({user:uid});
});
Meteor.publish("userrequested", function (uid) {
  return OAB_Request.find({'user.id':uid});
});

Meteor.methods({
  oabhold: function(rid,hold) {
    CLapi.internals.service.oabutton.hold(rid,hold);     
  },
  oabrefuse: function(rid) {
    CLapi.internals.service.oabutton.refuse(rid);     
  },
  addblocked: function(event) {
    OAB_Blocked.insert(event);
  },
  setstatus: function(status,rid,msg) {
    // only admin user should be able to do this
    OAB_Request.update(rid, {$set:{status:status}});
    var r = OAB_Request.findOne(rid);
    if (status === 'progress' && msg !== undefined && msg.text && msg.text.length > 0) {
      // when moving status to progress, email the author
      var email = r.email;
      if (email.constructor === Array) email = email[0];
      if (email.indexOf(',') !== -1) email = email.split(',')[0];
      var opts = {from:'data@openaccessbutton.org',to:email,text:msg.text};
      if (msg.subject) opts.subject = msg.subject;
      CLapi.internals.sendmail(opts,Meteor.settings.openaccessbutton.mail_url);
      // should also mail the user that created the request to let them know it is in progress (or every user supporting it?)
    }
  },
  untestrequest: function(rid) {
    // only admin user should be able to do this
    OAB_Request.update(rid,{$set:{test:false}});
  },
  maketestrequest: function(rid) {
    // only admin user should be able to do this
    OAB_Request.update(rid,{$set:{test:true}});
  },
  maketeststory: function(sid) {
    // only admin user should be able to do this
    OAB_Blocked.update(sid,{$set:{test:true}});
  },
  unteststory: function(sid) {
    // only admin user should be able to do this
    OAB_Blocked.update(sid,{$set:{test:false}});
  },
  deleterequest: function(rid) {
    // only admin user should be able to do this
    console.log('deleting request ' + rid);
    OAB_Request.remove(rid);
  },
  deleteblock: function(bid) {
    // only admin user should be able to do this
    console.log('deleting block story ' + bid);
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
  },
  gotbutton: function(uid) {
    Meteor.users.update(uid,{$set:{'service.openaccessbutton.downloaded':true}});
  },
  setreceived: function(respid,description,url) {
    var req = OAB_Request.findOne({receiver:respid});
    if (req && req.received === undefined) CLapi.internals.service.oabutton.receive(respid,undefined,url,description);
  },
  setvalidated: function(respid,uid) {
    var req = OAB_Request.findOne({receiver:respid});
    var today = new Date().getTime();
    if (req && req.received) OAB_Request.update(req._id,{$set:{'received.validated':{user:uid,date:today}}});
    if (req.type === 'data') {
      CLapi.internals.sendmail({
        from: Meteor.settings.openaccessbutton.mail_from,
        to: req.email,
        subject: 'Open Data Button submitted content validated!',
        text: "Hello " + req.email + ",\n\n" + "Thank you very much for providing content for the request at \n\nhttps://opendatabutton.org.org/request/" + req._id + "\n\nThe content you provided has now been validated by our community.\n\nYou are now eligible to display an Open Science Foundation Open Data Badge on your website! You can retrieve your badge at the following address:\n\nhttps://opendatabutton.org/static/osf_data_badge.jpg\n\nThanks very much again for your support,\n\nThe Open Data Button team."
      },Meteor.settings.openaccessbutton.mail_url);
    }
  },
  listreceivedfiles: function(respid) {
    var fs = Meteor.npmRequire('fs');
    var req = OAB_Request.findOne({receiver:respid});
    var fns = fs.readdirSync(Meteor.settings.uploadServer.uploadDir + '/openaccessbutton/' + respid);
    if (req && req.received && req.received.osf && req.received.osf.length === fns.length) {
      var ofns = [];
      for ( var f in fns ) {
        ofns.push({name:fns[f],url:req.received.osf[f]});
      }
      return {inosf:true,files:ofns}
    } else {
      return {files:fns}      
    }
  }
});
