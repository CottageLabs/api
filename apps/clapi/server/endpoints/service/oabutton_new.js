
// the NEW oabutton API.

// TODO: add a "I followed this URL route" which should work for badges too, and URLs of content we can direct people to

//OAB_DNR = new Mongo.Collection("oabutton_dnr");
OAB_DNR = new Mongo.Collection("oab_dnr");
OAB_SUPPORT = new Mongo.Collection("oab_support");
OAB_META = new Mongo.Collection("oab_meta");
OAB_AVAILABILITY = new Mongo.Collection("oab_availability"); // records use of that endpoint

CLapi.addRoute('service/oab', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'The Open Access Button API.'} };
    }
  },
  post: {
    authRequired:true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user ) ) {
        return {status: 'success', data: {info: 'You are authenticated'} };
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  }
});

CLapi.addRoute('service/oab/availability', {
  get: {
    action: function() {
      var opts = {url:this.queryParams.url,uid:this.userId}
      return {status:'success',data:CLapi.internals.service.oab.availability(opts)};
    }
  },
  post: {
    action: function() {
      var opts = this.request.body;
      opts.uid = this.userId;
      return {status:'success',data:CLapi.internals.service.oab.availability(opts)};
    }
  }
});

CLapi.addRoute('service/oab/request', {
  get: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user ) ) {
        return {status: 'success', data: 'You have access :)'}
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  },
  post: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user) ) {
        var req = this.request.body;
        req.test = this.request.headers.host === 'dev.api.cottagelabs.com' ? true : false;
        return CLapi.internals.service.oab.request(req,this.userId);
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  }
});
CLapi.addRoute('service/oab/request/:rid', {
  get: {
    action: function() {
      var r = OAB_Request.findOne(this.urlParams.rid);
      if (r) {
        return {status: 'success', data: r}
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  }
});

CLapi.addRoute('service/oab/support/:rid', {
  get: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user) ) {
        return CLapi.internals.service.oab.support(this.urlParams.rid,this.userId);
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  }
});

CLapi.addRoute('service/oab/query', {
  get: {
    action: function() {
      var rt = '/oabutton/request/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  }
});

CLapi.addRoute('service/oab/embed/:rid', {
  get: {
    action: function() {
      var rid = this.urlParams.rid;
      var b = OAB_Request.findOne(rid);
      if (b) {
        b.count = 0; // TODO this shold be stored in the request object
        var title = b.url;
        if ( b.metadata && b.metadata.title ) title = b.metadata.title;
        var template = '<div style="width:800px;padding:0;margin:0;"> \
  <div style="padding:0;margin:0;float:left;width:150px;height:200px;background-color:white;border:2px solid #398bc5;;"> \
    <img src="//openaccessbutton.org/static/oabutton_logo_final200.png" style="height:100%;width:100%;"> \
  </div> \
  <div style="padding:0;margin:0;float:left;width:400px;height:200px;background-color:#398bc5;;"> \
    <div style="height:166px;"> \
      <p style="margin:2px;color:white;font-size:30px;text-align:center;"> \
        <a target="_blank" href="https://openaccessbutton.org/request/' + rid + '" style="color:white;font-family:Sans-Serif;"> \
          Open Access Button \
        </a> \
      </p> \
      <p style="margin:2px;color:white;font-size:16px;text-align:center;font-family:Sans-Serif;"> \
        Request for content related to the article <br> \
        <a target="_blank" id="odb_article" href="https://openaccessbutton.org/request/' + rid + '" style="font-style:italic;color:white;font-family:Sans-Serif;"> \
        ' + title + '</a> \
      </p> \
    </div> \
    <div style="height:30px;background-color:#f04717;"> \
      <p style="text-align:center;font-size:16px;margin-right:2px;padding-top:1px;"> \
        <a target="_blank" style="color:white;font-family:Sans-Serif;" href="https://openaccessbutton.org/request/' + rid + '"> \
          ADD YOUR SUPPORT \
        </a> \
      </p> \
    </div> \
  </div> \
  <div style="padding:0;margin:0;float:left;width:200px;height:200px;background-color:#212f3f;"> \
    <h1 style="text-align:center;font-size:50px;color:#f04717;font-family:Sans-Serif;" id="odb_counter"> \
    ' + b.count + '</h1> \
    <p style="text-align:center;color:white;font-size:14px;font-family:Sans-Serif;"> \
      people have been unable to access this content, and support this request \
    </p> \
  </div> \
  <div style="width:100%;clear:both;"></div> \
</div>';
        return {statusCode: 200, body: {status: 'success', data: template}}
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  },
});

CLapi.addRoute('service/oab/accepts', {
  get: {
    authRequired:true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.admin',this.user ) ) {
        return {status:'success',data:CLapi.internals.service.oab.accepts()};
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  },
  post: {
    authRequired:true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.admin',this.user ) ) {
        return {status:'success',data:CLapi.internals.service.oab.accepts(this.request.body)};
      } else {
        return {statusCode: 401, body: {status: 'error', data: {info: 'You are not a member of the necessary group'}}}
      }
    }
  }
});

CLapi.addRoute('service/oab/status', {
  get: {
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.status()};
    }
  }
});



CLapi.internals.service.oab = {};

CLapi.internals.service.oab.status = function() {
  return {
    article: {
      requests:{
        total: OAB_Request.find({type:'article'}).count(),
        test: OAB_Request.find({$and:[{type:'article'},{test:true}]}).count(),
        users: OAB_Request.aggregate( [ { $match: { type: "article"}  }, { $group: { _id: "$user"}  } ] ).length,
        moderate: OAB_Request.find({$and:[{type:'article'},{status:'moderate'}]}).count(),
        progress: OAB_Request.find({$and:[{type:'article'},{status:'progress'}]}).count(),
        hold: OAB_Request.find({$and:[{type:'article'},{status:'hold'}]}).count(),
        refused: OAB_Request.find({$and:[{type:'article'},{status:'refused'}]}).count(),
        received: OAB_Request.find({$and:[{type:'article'},{status:'received'}]}).count()
      }
    },
    data: {
      requests:{
        total: OAB_Request.find({type:'data'}).count(),
        test: OAB_Request.find({$and:[{type:'data'},{test:true}]}).count(),
        users: OAB_Request.aggregate( [ { $match: { type: "data"}  }, { $group: { _id: "$user"}  } ] ).length,
        moderate: OAB_Request.find({$and:[{type:'data'},{status:'moderate'}]}).count(),
        progress: OAB_Request.find({$and:[{type:'data'},{status:'progress'}]}).count(),
        hold: OAB_Request.find({$and:[{type:'data'},{status:'hold'}]}).count(),
        refused: OAB_Request.find({$and:[{type:'data'},{status:'refused'}]}).count(),
        received: OAB_Request.find({$and:[{type:'data'},{status:'received'}]}).count()
      }
    },
    users: CLapi.internals.accounts.count({"roles.openaccessbutton":{$exists:true}})    
  }
}

/*
addition should be:
{
  type: 'article',
  conditions: {}
}
and conditions is dependent on type - later it will probably be to do with ILLs
*/
CLapi.internals.service.oab.accepts = function(addition) {
  var meta = OAB_META.findOne('meta');
  if (!meta) meta = {_id: OAB_META.insert({_id:'meta',accepts:[]}), accepts:[] };
  if (addition) {
    var exists = false;
    for ( var a in meta.accepts ) {
      if ( addition.accepts.type && meta.accepts[a].type !== addition.type ) {
        exists = true;
      }
    }
    if (!exists) {
      meta.accepts.push(addition);
      OAB_META.update('meta',{$set:{accepts:meta.accepts}});
    }
  }
  return meta.accepts;
}

/*
to create a request the url and type are required, What about story?
{
  url: "url of item request is about",
  type: "article OR data (OR code eventually and possibly other things)",
  story: "the story of why this request / support, if supplied",
  email: "email address of person to contact to request",
  count: "the count of how many people support this request",
  createdAt: "date request was created",
  status: "moderate OR progress OR hold OR refused OR received",
  receiver: "unique ID that the receive endpoint will use to accept one-time submission of content",
  metadata: {
    // the bibjson metadata object, to be extracted from the url
  },
  user: {
    id: "user ID of user who created request",
    username: "username of user who created request",
    email: "email of user who created request"
  },
  followup: [
    {
      date: "date of followup",
      email:"email of this request at time of followup"
    }
  ],
  hold: {
    from: "date it was put on hold",
    until: "date until it is on hold to",
    by: "email of who put it on hold"
  },
  holds: [
    {"history": "of hold items, as above"}
  ],
  refused: [
    {
      email: "email address of author who refused to provide content (adding themselves to dnr is implicit refusal too)",
      date: "date the author refused"
    }
  ],
  received: {
    date: "date the item was received",
    from: "email of who it was received from",
    description: "description of provided content, if available".
    url: "url to where it is (remote if provided, or on our system if uploaded)"
  }
}
*/
CLapi.internals.service.oab.request = function(req,uid) {
  console.log('Creating oabutton request notification');
  var user = Meteor.users.findOne(uid);
  req.user = {
    id: user._id,
    username: user.username,
    email: user.emails[0].address
  }
  req.status = "new";
  req.count = 0;
  req.metadata = CLapi.internals.academic.catalogue.extract(req.url);
  // check if an email was provided in the request object. If so, see if not on dnr. If not, need to use one from extraction of metadata
  req.test = true; // set if meets some test criteria
  req.receiver = CLapi.internals.store.receiver(req); // is store receiver really necessary here?
  req._id = OAB_Request.insert(req);
  return opts.request;
}

CLapi.internals.service.oab.support = function(rid,story,uid) {
  var r = OAB_Request.findOne(rid);
  if ( !CLapi.internals.service.oab.supports(rid,uid) ) {
    OAB_Request.update(rid,{$set:{count:r.count + 1}});
    var user = Meteor.users.findOne(uid);
    OAB_Support.insert({url:r.url,uid:uid,username:user.username,email:user.emails[0].address,story:story});
    return true;
  } else {
    return false;
  }
}

CLapi.internals.service.oab.supports = function(rid,uid,url) {
  var matcher = {};
  if (rid) matcher._id = rid;
  
  var supports = OAB_SUPPORT.find().fetch();
  // return all the records of users supporting this request ID, or all supports by a given user, or all supports of a given request, 
  // or all supports by url, or supports by user of url (by url could have multiples, because types)
}

/*
{
  availability: [
    {
      type: 'article',
      url: <URL TO OBJECT - PROB A REDIRECT URL VIA OUR SYSTEM FOR STAT COUNT>
    }
  ],
  // will only list requests of types that are not yet available
  requests:[
    {
      type:'data',
      _id: 1234567890,
      usupport: true/false,
      ucreated: true/false
    },
    ...
  ],
  // only the accepts that we don't yet have available, and don't yet have requests for
  accepts: [
    {
      type:'article',
      conditions: {
        <any conditions the plugin may need to make decisions on later>
      }
    }
  ]
}
*/
CLapi.internals.service.oab.availability = function(opts) {
  if (opts === undefined) opts = {url:undefined,type:undefined}
  OAB_AVAILABILITY.insert(opts); // just records usage of this endpoint
  
  if (opts.url === undefined) return {}
  
  var already = [];
  var ret = {availability:[],requests:[],accepts:[]};
    
  if ( opts.type === 'data' || opts.type === undefined ) {
    // any useful places to check - append discoveries to availability
    // if found, push 'data' into already
    // {type:'data',url:<URL>}
  }
  if ( opts.type === 'article' || opts.type === undefined ) {
    // check with dissemin
    // worth checking with core?
    // any useful places to check - append discoveries to availability
    // if found, push 'article' into already
    // {type:'article',url:<URL>}
  }
  // TODO add availability checkers for any new types that are added to the accepts list  

  var matcher = {url:opts.url};
  if (opts.type) matcher.type = opts.type;
  var requests = OAB_Request.find(matcher).fetch();
  for ( var r in requests ) {
    if ( already.indexOf(requests[r].type) === -1 ) {
      ret.requests.push(requests[r]);
      already.push(requests[r].type);
    }
  }
  
  var accepts = CLapi.internals.service.oab.accepts();
  for ( var a in accepts ) {
    if ( already.indexOf(accepts[a]) === -1) ret.accepts.push(accepts[a]);
  }

  //CLapi.internals.academic.resolve(url); 
  // TODO make sure academic resolve is updated to handle URLs as well as DOIs/IDs
  // and make sure academic resolve is updated to check oabutton requests for receied items
  return ret;
}

CLapi.internals.service.oabutton.hold = function(rid,days) {
  var today = new Date().getTime();
  var date = (Math.floor(today/1000) + (days*86400)) * 1000;
  var r = OAB_Request.findOne(rid);
  if (r.holds === undefined) r.holds = [];
  if (r.hold) r.holds.push(r.hold);
  r.hold = {from:today,until:date};
  r.status = 'hold';
  OAB_Request.update(rid,{$set:{hold:r.hold,holds:r.holds,status:r.status}});
  //CLapi.internals.sendmail(); // inform requestee that their request is on hold
  return {status: 'success', data: r};
}

CLapi.internals.service.oabutton.refuse = function(rid,reason) {
  var today = new Date().getTime();
  var r = OAB_Request.findOne(rid);
  if (r.holds === undefined) r.holds = [];
  if (r.hold) r.holds.push(r.hold);
  delete r.hold;
  if (r.refused === undefined) r.refused = [];
  r.refused.push({date:today,email:r.email,reason:reason});
  r.status = 'refused';
  delete r.email;
  OAB_Request.update(rid,{$set:{hold:undefined,email:undefined,holds:r.holds,refused:r.refused,status:r.status}});
  //CLapi.internals.sendmail(); // inform requestee that their request has been refused
  return {status: 'success', data: r};
}

CLapi.internals.service.oabutton.followup = function(rid) {
  var MAXEMAILFOLLOWUP = 5; // how many followups to one email address will we do before giving up, and can the followup count be reset or overrided somehow?
  var r = OAB_Request.findOne(rid);
  if (r.followup === undefined) r.followup = [];
  var thisfollows = 0;
  for ( var i in r.followup ) {
    if ( r.followup[i].email === r.email) thisfollows += 1;
  }
  var today = new Date().getTime();
  var dnr = OAB_DNR.findOne({email:r.email});
  if (dnr) {
    return {status:'error',data:'The email address for this request has been placed on the do-not-request list, and can no longer be contacted'}
  } else if (r.hold && r.hold.until > today) { // check that this date comparison works
    return {status:'error', data:'This request is currently on hold, so cannot be followed up yet.'}
  } else if (thisfollows >= MAXEMAILFOLLOWUP ) {
    return {status:'error', data:'This request has already been followed up the maximum number of times.'}
    // should we alter the request to indicate an implicit refusal by the author?
  } else {
    //CLapi.internals.sendmail(); //email the request email contact with the followup request
    r.followup.push({date:today,email:r.email});
    OAB_Request.update(r._id,{$set:{followup:r.followup,status:'progress'}});
    return {status:'success',data:r}
  }
}

CLapi.internals.service.oabutton.receive = function(rid,content,url,description) {
  // TODO this currently only works via the UI, after file uploads are set as complete, this is triggered
  // an actuall call to this on the API would trigger emails and deposits for files that had already been processed
  // and also could fail on cluster deployment because only the root machine would actually be able to find the files
  var r = OAB_Request.findOne({receiver:rid});
  if (!r) {
    return {status: 'error', data: 'no request matching that response ID'}
  } else if (r.received) {
    return {status: 'error', data: 'content already received'}
  } else {
    //if (content) CLapi.internals.store.receive(rid,content); // TODO put it in the store, unless it is a URL, then what? - match how stored via upload UI too
    var today = new Date().getTime();
    r.received = {date:today,from:r.email,url:url,description:description};
    if (r.hold) delete r.hold;
    r.status = 'received'

    var mu = Meteor.settings.openaccessbutton.mail_url;
    var mf = Meteor.settings.openaccessbutton.mail_from;
    var w = r.type === 'data' ? 'Opendatabutton' : 'Openaccessbutton';

    // email the person that provided the content, confirming receipt
    CLapi.internals.sendmail({
      from: mf,
      to: r.email,
      subject: w + ' submission received',
      text: "Hello " + r.email + ",\n\n" + "Thank you very much for your submission to the request at \n\nhttps://" + w.toLowerCase() + '.org/request/' + r._id + "\n\nWe have contacted all the people who needed access to this content to let them know you've been so helpful in making it available.\n\nThanks very much again for your support,\n\nThe " + w + " team."
    },mu);  
    // email the person that started the request
    CLapi.internals.sendmail({
      from: mf,
      to: r.user.email,
      subject: w + ' request successful!',
      text: "Hello " + r.user.email + ",\n\n" + "Your " + w + " request has been successful!\n\nThe requested content is now available - check the request page for more information.\n\nhttps://" + w.toLowerCase() + '.org/request/' + r._id + "\n\nThanks very much for your support,\n\nThe " + w + " team."
    },mu);
    // email everyone who wanted it
    var wants = [];
    OAB_Support.find({url:r.url}).forEach(function(b) {
      var u = Meteor.users.findOne(b.user);
      var addr = u.emails[0].address;
      if (wants.indexOf(addr) === -1) wants.push(addr);
    });
    CLapi.internals.sendmail({
      from: mf,
      bcc: wants,
      subject: w + ' request successful!',
      text: "Hello!\n\n" + "An " + w + " request for content that you supported has been successful!\n\nThe requested content is now available - check the request page for more information.\n\nhttps://" + w.toLowerCase() + '.org/request/' + r._id + "\n\nThanks very much for your support,\n\nThe " + w + " team."
    },mu);
    
    if (r.type === 'data') {
      // send to the OSF system via the oabutton project email address
      // see http://help.osf.io/m/58281/l/546443-upload-your-research and an example https://osf.io/view/SPSP2016/
      // TODO now need some way to look up osf API to get the ID of the item we just submitted - then save that URL in the request received info
      var fs = Meteor.npmRequire('fs');
      var rdir = Meteor.settings.uploadServer.uploadDir + 'openaccessbutton/' + rid + '/';
      var files = fs.readdirSync(rdir);
      var titles = [];
      for ( var f in files ) {
        var fl = files[f];
        var s = r.metadata && r.metadata.title ? r.metadata.title : fl;
        titles.push(s);
        CLapi.internals.sendmail({
          from: r.email,
          to: Meteor.settings.openaccessbutton.osf_address,
          subject: s,
          attachments:[{
            fileName: fl,
            filePath: rdir + fl
          }]
        },mu);
      }
      Meteor._sleepForMs(5000);
      var l = CLapi.internals.tdm.extract({url:"https://osf.io/view/osfm2015/",match:'/\{"nodeurl.*/gi',start:"meetingData",end:"];"});
      var sl = '[' + l.matches[0].result[0] + ']';
      var listing = JSON.parse(sl);
      for ( var li in listing ) {
        var ls = listing[li];
        if ( titles.indexOf(ls.title) !== -1 ) {
          if (r.received.osf === undefined) r.received.osf = [];
          var u = 'https://osf.io' + ls.nodeUrl;
          if (r.received.osf.indexOf(u) === -1) r.received.osf.push(u);
        }
      }
    } else {
      // submit articles to zenodo
    }

    OAB_Request.update(r._id,{$set:{hold:undefined,received:r.received,status:'received'}});
    return {status: 'success', data: r};
  }
}

CLapi.internals.service.oab.validate = function(url,type) {
}

CLapi.internals.service.oabutton.followups = function() {
  // look for any request in progress and see how far past progress date it is
  // so need to be able to check when it was set to in progress!
  // send a chase email to the author in question - if not already refused or put on hold or author joined dnr list
  // so call the followup function for each relevant request
}

if ( Meteor.settings.cron.oabutton ) {
  SyncedCron.add({
    name: 'oabutton',
    schedule: function(parser) { return parser.recur().every(1).day(); }, // what should schedule of this be?
    job: CLapi.internals.service.oabutton.followups
  });
}

