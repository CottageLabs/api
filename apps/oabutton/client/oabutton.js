
var RESULTS_INCREMENT = 20;
Session.setDefault('resultsLimit', RESULTS_INCREMENT);

Deps.autorun(function() {
  blockedsub = Meteor.subscribe('userblocked', Meteor.userId(), Session.get('resultsLimit'));
});

// whenever #showMoreResults becomes visible, retrieve more results
function showMoreVisible() {
  var threshold, target = $("#showMoreResults");
  if (!target.length) return;

  threshold = $(window).scrollTop() + $(window).height() - target.height();

  if (target.offset().top <= threshold) {
    if (!target.data("visible")) {
      target.data("visible", true);
      Session.set("resultsLimit",
          Session.get("resultsLimit") + RESULTS_INCREMENT);
    }
  } else {
    if (target.data("visible")) {
      target.data("visible", false);
    }
  }        
}
$(window).scroll(showMoreVisible);

Template.oabuttonstory.story = function() {
  return OAB_Blocked.findOne(Session.get('blockedid'));
}
Template.oabuttonstory.request = function() {
  var b = OAB_Blocked.findOne(Session.get('blockedid'));
  return OAB_Request.findOne({url:b.url});
}


Template.oabuttonrequest.request = function() {
  return OAB_Request.findOne(Session.get('requestid'));
}
Template.oabuttonrequest.blocked = function() {
  return OAB_Blocked.find({url:Session.get('url')});
}
Template.oabuttonrequest.blockedcount = function() {
  return OAB_Blocked.find({url:Session.get('url')}).count();
}
Template.oabuttonrequest.requesttitle = function() {
  var r = OAB_Request.findOne(Session.get('requestid'));
  if ( r.metadata && r.metadata.title ) {
    return r.metadata.title;
  } else {
    return '';
  }
}
Template.oabuttonrequest.requeststatus = function() {
  var r = OAB_Request.findOne(Session.get('requestid'));
  if (r.status === 'moderate') {
    return 'is awaiting approval';
  } else if (r.status === 'progress') {
    return 'is in progress';
  } else if (r.status === 'hold') {
    return 'is on hold';
  } else if (r.status === 'refused') {
    return 'has been refused';
  } else if (r.status === 'received') {
    return 'has been received';
  }
}

Template.oabuttonstory.events({
  'click #deleteblock': function(e) {
    var sid = Session.get("blockedid");
    Meteor.call('deletestory',sid);
    // TODO should redirect to somewhere now, and confirm deletion
  },
  'click #maketeststory': function(e) {
    var sid = Session.get("blockedid");
    Meteor.call('maketeststory',sid);
  },
  'click #unteststory': function(e) {
    var sid = Session.get("blockedid");
    Meteor.call('unteststory',sid);
  }
});

Template.oabuttonrequest.events({
  'change #status': function() {
    $('#statuschanged').hide();
    var s = $('#status').val();
    if (s === 'progress') {
      $('#setstatus').html("Change status and send email.");
      var r = OAB_Request.findOne(Session.get("requestid"));
      var email = r.email;
      if (email.constructor === Array) email = email[0];
      if (email.indexOf(',') !== -1) email = email.split(',')[0];
      var blocks = OAB_Blocked.find({url:Session.get('url')}).count();
      var type = r.type ? r.type : 'article';
      var text = mail_templates[type].author_request.text;
      var b = OAB_Blocked.find({url:Session.get('url')}).count();
      text = text.replace(/\{\{blocks\}\}/g,b);
      text = text.replace(/\{\{rid\}\}/g,r._id);
      text = text.replace(/\{\{respond\}\}/g,r.receiver);
      text = text.replace(/\{\{email\}\}/g,email);
      var article = r.url;
      if (r.title) article = r.title + 'published at this URL:\n\n' + article;
      text = text.replace(/\{\{article\}\}/g,article);
      $('#text').val(text).show();
    }
  },
  'click #setstatus': function(e) {
    var reqid = Session.get("requestid");
    var r = OAB_Request.findOne(reqid);
    var type = r.type ? r.type : 'article';
    var status = $('#status').val();
    var msg = {
      text: $('#text').val(),
      subject: mail_templates[type].author_request.subject
    }
    $('#text').val("").hide();
    $('#statuschanged').show();
    Meteor.call('setstatus',status,reqid,msg);
  },
  
  'click #emailusers': function() {
    $('#text').show();
    $('#emailusers').html("Once email content is written, click here to send.");
    var text = $('#text').val();
    if (text.length > 0) {
      var reqid = Session.get("requestid");
      Meteor.call('emailusers',reqid,text);
      $('#text').val("").hide();
      $('#emailusers').html("Email to users sent! Click here to send another.");      
    }
  },

  'click #deleterequest': function(e) {
    var reqid = Session.get("requestid");
    Meteor.call('deleterequest',reqid);
    // TODO should redirect to somewhere now, and confirm deletion
  },
  'click #maketestrequest': function(e) {
    var reqid = Session.get("requestid");
    Meteor.call('maketestrequest',reqid);
  },
  'click #untestrequest': function(e) {
    var reqid = Session.get("requestid");
    Meteor.call('untestrequest',reqid);
  },
  'click #addsupport': function() {
    var reqid = Session.get("requestid");
    console.log('Creating oabutton request support block for ' + reqid);
    var req = OAB_Request.findOne(reqid);
    var event = {user:Meteor.userId(), createdAt: new Date().getTime()};
    event.url = req.url;
    event.metadata = req.metadata;
    event.story = $('#supportstory').val();
    event.plugin = 'support_request';
    event.type = 'data';
    event.request = req._id;
    console.log(event);
    Meteor.call('addblocked',event);
    $('.addsupport').toggle();
  }
});

Template.oabuttonheader.events({
  'click a': function(e) {
    // force nav link clicks to reload page - bad for normal meteor, but because every page except accounts and specific 
    // requests and stories are being served statically, we want to force the reload so the static pages get served instead
    window.location = e.target.href;
  }
});

Template.oabuttonaccount.events({
    'click #logout-btn': function (e, tmpl) {
        e.preventDefault();
        Meteor.logout();
        Session.set("email",null);
        //window.location = '/login';
    },
    'click #set-username': function () {
      var res = Meteor.call('setusername', Meteor.userId(), $('#new-username').val());
      if ( !res ) {
        $('#new-username').val("");
        $('#new-username').attr("placeholder","Sorry that username is taken. Please try another.");
      }
    },
    'change #set-profession': function () {
      Meteor.call('setprofession', Meteor.userId(), $('#set-profession').val());
    },
    'change #confirm_public': function () {
      Meteor.call('confirmpublic', Meteor.userId(), $('#set-profession').val());
    },
    'change #confirm_terms': function () {
      Meteor.call('confirmterms', Meteor.userId(), $('#set-profession').val());
    },
    'change #mailinglist': function () {
      Meteor.call('mailinglist', Meteor.userId(), $('#set-profession').val());
    }
});
Template.oabuttonaccount.username = function() {
  if ( Meteor.user().username ) {
    return Meteor.user().username;
  } else {
    return Meteor.user().emails[0].address;
  }
};
Template.oabuttonaccount.defaultapikey = function() {
  for ( var k in Meteor.user().api.keys ) {
    var dk = Meteor.user().api.keys[k];
    if ( dk.name === 'default' ) return dk.key;
  }
};

Template.oabuttonaccount.stories = function() {
  return OAB_Blocked.find();
}
Template.oabuttonaccount.moreResults = function() {
  return !(OAB_Blocked.find().count() < Session.get("resultsLimit"));
}
Template.oabuttonaccount.rendered = function() {
  if ( blockedsub && blockedsub.ready() ) showMoreVisible();
}

Meteor.startup(function () {
  Session.set("uploadcount",0);
  Session.set("urlprovided",false);
});
Template.oabuttonupload.helpers({
  oabuploadactions: function() {
    return {
      formData: function() { return { service: 'openaccessbutton', dirId: Session.get("respid") } },
      finished: function(index, fileInfo, context) { 
        Session.set("uploadcount",Session.get("uploadcount")+1);
      }
    }
  }
});
Template.oabuttonupload.events({
  'click #submitfiles': function (e) {
    e.preventDefault();
    var url = $('#provideurl').val();
    if (url.length > 0 && url.indexOf('http') !== 0) url = 'http://' + url;
    Meteor.call('setreceived',Session.get("respid"),$('#oabuploaddesc').val(),url);
  }
});

Template.oabuttonuploadreceived.request = function() {
  return OAB_Request.findOne({receiver:Session.get('respid')});
}

Template.oabuttonuploadreceived.helpers({
  availablefiles: function() {
    return Session.get('files');
  }
});
Template.oabuttonuploadreceived.events({
  'click #setvalidated': function (e) {
    e.preventDefault();
    Meteor.call('setvalidated',Session.get("respid"),Meteor.userId());
  }
});  

