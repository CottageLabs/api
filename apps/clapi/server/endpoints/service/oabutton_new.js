
// the NEW oabutton API.

// TODO: add a "I followed this URL route" which should work for badges too, and URLs of content we can direct people to

//OAB_DNR = new Mongo.Collection("oabutton_dnr");
oab_dnr = new Mongo.Collection("oab_dnr");
oab_support = new Mongo.Collection("oab_support");
oab_meta = new Mongo.Collection("oab_meta");
oab_availability = new Mongo.Collection("oab_availability"); // records use of that endpoint
oab_request = new Mongo.Collection("oab_request"); // records use of that endpoint

oab_availability.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
oab_availability.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/availability/' + this._id, doc);
});
oab_availability.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
oab_availability.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/availability/' + doc._id, doc);
});
oab_availability.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/availability/' + doc._id);
});

oab_request.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
oab_request.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/request/' + this._id, doc);
});
oab_request.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
oab_request.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/request/' + doc._id, doc);
});
oab_request.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/request/' + doc._id);
});

oab_support.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
oab_support.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/support/' + this._id, doc);
});
oab_support.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
oab_support.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/support/' + doc._id, doc);
});
oab_support.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/support/' + doc._id);
});

CLapi.addCollection(oab_availability);
CLapi.addCollection(oab_support);
CLapi.addCollection(oab_request);

CLapi.addRoute('service/oab', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'The Open Access Button API.'} };
    }
  },
  post: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return {status: 'success', data: {info: 'You are authenticated'} };
    }
  }
});

CLapi.addRoute('service/oab/availability', {
  get: {
    action: function() {
      var opts = {url:this.queryParams.url,test:this.queryParams.test}
      if ( this.request.headers['x-apikey'] ) {
        // we don't require auth for availability checking, but we do want to record the user if they did have auth
        var acc = CLapi.internals.accounts.retrieve(this.request.headers['x-apikey']);
        if (acc) {
          opts.uid = acc._id;
          opts.username = acc.username;
          opts.email = acc.emails[0].address;
        }
      }
      if (!opts.test && CLapi.internals.service.oab.blacklist(opts.url)) {
        return {statusCode: 400, body: {status: 'error', data: {info: 'The provided URL is not one that availability can be checked for'}}}
      } else {
        return {status:'success',data:CLapi.internals.service.oab.availability(opts)};
      }
    }
  },
  post: {
    action: function() {
      // TODO and NOTE - the plugin will handle errors by response. If it receives a 412, it will display the content of the 
      // message key of the response object. So, as the first thing the plugin does is an availability check, we can do tests 
      // here on the incoming request, such as check the plugin being used, or the user account, etc, and if necessary 
      // return a 412 with an object containing a message key pointing to whatever we want to say to the users
      var opts = this.request.body;
      if ( this.request.headers['x-apikey'] ) {
        // we don't require auth for availability checking, but we do want to record the user if they did have auth
        var acc = CLapi.internals.accounts.retrieve(this.request.headers['x-apikey']);
        if (acc) {
          opts.uid = acc._id;
          opts.username = acc.username;
          opts.email = acc.emails[0].address;
        }
      }
      if (!opts.test && CLapi.internals.service.oab.blacklist(opts.url)) {
        return {statusCode: 400, body: {status: 'error', data: {info: 'The provided URL is not one that availability can be checked for'}}}
      } else {
        return {status:'success',data:CLapi.internals.service.oab.availability(opts)};
      }
    }
  }
});

CLapi.addRoute('service/oab/request', {
  get: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return {status: 'success', data: 'You have access :)'}
    }
  },
  post: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      var req = this.request.body;
      req.test = this.request.headers.host === 'dev.api.cottagelabs.com' ? true : false;
      return CLapi.internals.service.oab.request(req,this.userId);
    }
  }
});
CLapi.addRoute('service/oab/request/:rid', {
  get: {
    action: function() {
      var r = oab_request.findOne(this.urlParams.rid);
      if (r) {
        var uid;
        if (this.queryParams.apikey || this.request.headers['x-apikey']) {
          var l = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
          var u = CLapi.internals.accounts.retrieve(l);
          if (u) uid = u._id;
        }
        if (!uid) {
          try {
            var name = Meteor.settings.public.loginState.cookieName + "=";
            var ca = this.request.headers.cookie.split(';');
            var cookie;
            cookie = JSON.parse(decodeURIComponent(function() {
              for(var i=0; i<ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1);
                if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
              }
              return "";
            }()));
            uid = cookie.userId;
          } catch (err) {}
        }
        if (uid) r.supports = CLapi.internals.service.oab.supports(this.urlParams.rid,uid);
        return {status: 'success', data: r}
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  },
  post: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      var r = oab_request.findOne(this.urlParams.rid);
      if (r) {
        // depending on whether user, creator, or admin, affects what things can be updated
        var n = {};
        if (CLapi.internals.accounts.auth('openaccessbutton.admin',this.user)) {
          if (this.request.body.test !== undefined) n.test = this.request.body.test;
          if (this.request.body.status !== undefined) n.status = this.request.body.status;
          if (this.request.body.email !== undefined) n.email = this.request.body.email;
          if (this.request.body.story !== undefined) n.story = this.request.body.story;
        }
        if (this.request.body.email !== undefined && ( CLapi.internals.accounts.auth('openaccessbutton.admin',this.user) || r.status === undefined || r.status === 'help' || r.status === 'moderate' || r.status === 'refused' ) ) n.email = this.request.body.email;
        if (this.userId === r.user.id && this.request.body.story !== undefined) n.story = this.request.body.story;
        if (this.request.body.url !== undefined) n.url = this.request.body.url;
        if (this.request.body.title !== undefined) n.title = this.request.body.title;
        if (this.request.body.doi !== undefined) n.doi = this.request.body.doi;
        if (n.status === undefined) {
          if ( (!r.title && !n.title) || (!r.email && !n.email) ) {
            n.status = 'help';
          } else if (r.status === 'help' && ( (r.title || n.title) && (r.email || n.email) ) ) {
            n.status = 'moderate';
          }
        }
        if (JSON.stringify(n) !== '{}') oab_request.update(r._id,{$set:n});
        return oab_request.findOne(r._id); // return how it now looks? or just return success?
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  },
  delete: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      oab_request.remove(this.urlParams.rid);
      // remove support? No, keep, in case the URL gets requested in future, we can match to it again perhaps
      return {}
    }
  }
});

CLapi.addRoute('service/oab/support/:rid', {
  get: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return CLapi.internals.service.oab.support(this.urlParams.rid,this.queryParams.story,this.userId);
    }
  },
  post: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return CLapi.internals.service.oab.support(this.urlParams.rid,this.request.body.story,this.userId);
    }
  }
});

CLapi.addRoute('service/oab/supports/:rid', {
  get: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return CLapi.internals.service.oab.supports(this.urlParams.rid,this.userId);
    }
  }
});

CLapi.addRoute('service/oab/supports', {
  get: {
    action: function() {
      var rt = '/oab/support/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/oab/support/_search',data);
    }
  }
});

CLapi.addRoute('service/oab/availabilities', {
  get: {
    action: function() {
      var rt = '/oab/availability/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/oab/availability/_search',data);
    }
  }
});

CLapi.addRoute('service/oab/query', {
  get: {
    action: function() {
      var rt = '/oab/request/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/oab/request/_search',data);
    }
  }
});

CLapi.addRoute('service/oab/users', {
  get: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      var rt = '/clapi/accounts/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/clapi/accounts/_search',data);
    }
  }
});

CLapi.addRoute('service/oab/embed/:rid', {
  get: {
    action: function() {
      var rid = this.urlParams.rid;
      var b = oab_request.findOne(rid);
      if (b) {
        var title = b.url;
        if ( b.title ) title = b.title;
        var template = '<div style="width:800px;padding:0;margin:0;"> \
  <div style="padding:0;margin:0;float:left;width:150px;height:200px;background-color:white;border:2px solid #398bc5;;"> \
    <img src="//openaccessbutton.org/static/icon_OAB.png" style="height:100%;width:100%;"> \
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
        <a target="_blank" id="oab_article" href="https://openaccessbutton.org/request/' + rid + '" style="font-style:italic;color:white;font-family:Sans-Serif;"> \
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
    <h1 style="text-align:center;font-size:50px;color:#f04717;font-family:Sans-Serif;" id="oab_counter"> \
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

CLapi.addRoute('service/oab/scrape', {
  get: {
    //roleRequired:'openaccessbutton.user',
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.scrape(this.queryParams.url,this.queryParams.content,this.queryParams.refresh,this.queryParams.doi)};
    }
  }
});

CLapi.addRoute('service/oab/accepts', {
  get: {
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.accepts()};
    }
  },
  post: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.accepts(this.request.body)};
    }
  }
});

CLapi.addRoute('service/oab/blacklist', {
  get: {
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.blacklist()};
    }
  },
  post: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      var url = this.queryParams.url ? this.queryParams.url : this.request.body.url;
      return {status:'success',data:CLapi.internals.service.oab.blacklist(url,true)};
    }
  },
  delete: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      var url = this.queryParams.url ? this.queryParams.url : this.request.body.url;
      return {status:'success',data:CLapi.internals.service.oab.blacklist(url,false)};
    }
  }
});

CLapi.addRoute('service/oab/templates', {
  get: {
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.template(this.queryParams.template,this.queryParams.refresh)};
    }
  }
});

CLapi.addRoute('service/oab/substitute', {
  post: {
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.substitute(this.request.body.content,this.request.body.vars,this.request.body.markdown)};
    }
  }
});

CLapi.addRoute('service/oab/sendmail', {
  post: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      return {status:'success',data:CLapi.internals.service.oab.sendmail(this.request.body)};
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
    requests: oab_request.find().count(),
    article: oab_request.find({type:'article'}).count(),
    data: oab_request.find({type:'data'}).count(),
    test: oab_request.find({test:true}).count(),
    help: oab_request.find({status:'help'}).count(),
    moderate: oab_request.find({status:'moderate'}).count(),
    progress: oab_request.find({status:'progress'}).count(),
    hold: oab_request.find({status:'hold'}).count(),
    refused: oab_request.find({status:'refused'}).count(),
    received: oab_request.find({status:'received'}).count(),    
    supports: oab_support.find().count(),
    availabilities: oab_availability.find().count(),
    users: CLapi.internals.accounts.count({"roles.openaccessbutton":{$exists:true}}),
    requested: oab_request.aggregate( [ { $group: { _id: "$user"}  } ] ).length,
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
  var meta = oab_meta.findOne('meta');
  if (!meta) meta = {_id: oab_meta.insert({_id:'meta',accepts:[]}), accepts:[] };
  if (!meta.accepts) meta.accepts = [];
  if (addition) {
    var exists = false;
    for ( var a in meta.accepts ) {
      if ( addition.type && meta.accepts[a].type === addition.type ) exists = true;
    }
    if (!exists) {
      meta.accepts.push(addition);
      oab_meta.update('meta',{$set:{accepts:meta.accepts}});
    }
  }
  return meta.accepts;
}

CLapi.internals.service.oab.blacklist = function(url,add) {
  if (url !== undefined && (url.length < 4 || url.indexOf('.') === -1) ) return false;
  // TODO could make this a load from a google sheet...
  var bd = [
    'chrome://',
    'chrome-extension',
    'about:',
    'file://',
    'resource://',
    'openaccessbutton.org',
    'opendatabutton.org',
    'twitter.com',
    'dropbox.com',
    'mail.google',
    'drive.google',
    'docs.google',
    'calendar.google',
    'google.com/maps',
    'gmail.com',
    'netflix.com',
    'youtube.com',
    'addons.mozilla.org',
    'facebook.com',
    'github.com',
    'amazon.com',
    'w3schools.com',
    'soundcloud.com'
  ];
  var meta = oab_meta.findOne('meta');
  if (!meta) meta = {_id: oab_meta.insert({_id:'meta',accepts:[],blacklist:[]}), accepts:[], blacklist:bd };
  if (!meta.blacklist || meta.blacklist.length === 0) {
    meta.blacklist = bd;
    oab_meta.update('meta',{$set:{blacklist:meta.blacklist}});
  }
  var listed = meta.blacklist.indexOf(url);
  if (add === true && listed === -1) {
    url = url.replace('https://','').replace('http://','').split('?')[0].split('#')[0];
    meta.blacklist.push(url);
    oab_meta.update('meta',{$set:{blacklist:meta.blacklist}});
    return true;
  } else if (add === false) {
    if (listed !== -1) {
      meta.blacklist.splice(listed,1);
      oab_meta.update('meta',{$set:{blacklist:meta.blacklist}});
    }
    return listed !== -1;
  } else if (url) {
    for ( var b in meta.blacklist ) {
      if (url.indexOf(meta.blacklist[b]) !== -1) return true;
    }
    return false;
  } else {
    return meta.blacklist;
  }
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
  status: "help OR moderate OR progress OR hold OR refused OR received",
  receiver: "unique ID that the receive endpoint will use to accept one-time submission of content",
  title: "article title",
  doi: "article doi",
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
  // this can contain user-side data so fail silently if anything wrong
  if (JSON.stringify(req).indexOf('<script') !== -1) return false; // naughty catcher
  if (req.type === undefined) req.type = 'article';
  var exists = oab_request.findOne({url:req.url,type:req.type});
  if (exists) return false;
  // a blacklisted URL should not be sent to request, because the availability check would have returned 400
  // the request endpoint will accept blacklisted URLs, but here they just get bounced to false
  // we could do something else with them here if we wanted, but for now just false them
  if (!req.test && CLapi.internals.service.oab.blacklist(req.url)) return false;
  console.log('Creating oabutton request notification');
  var user = Meteor.users.findOne(uid);
  if (!req.user && user) { // this should actually never be the case but is useful for loading old data into test system
    req.user = {
      id: user._id,
      username: user.username,
      email: user.emails[0].address
    }
  }
  try {req.user.affiliation = user.service.openaccessbutton.profile.affiliation; } catch(err) {}
  try {req.user.profession = user.service.openaccessbutton.profile.profession; } catch(err) {}
  req.count = 1;
  if (!req.title || !req.email || !req.keywords) { // worth scraping on any other circumstance?
    var meta = CLapi.internals.academic.catalogue.extract(req.url,req.dom,undefined,req.doi);
    req.keywords = meta && meta.keywords ? meta.keywords : [];
    req.title = meta && meta.title ? meta.title : "";
    req.doi = meta && meta.doi ? meta.doi : "";

    // TODO should check DNR list for emails before using them
    req.email = meta && meta.email && meta.email.length > 0 ? meta.email[0] : "";
    
    // some optional extract that the extract can return
    req.author = meta && meta.author ? meta.author : [];
    req.journal = meta && meta.journal ? meta.journal : "";
    req.issn = meta && meta.issn ? meta.issn : "";
    req.publisher = meta && meta.publisher ? meta.publisher : "";
  }

  req.status = !req.title || !req.email ? "help" : "moderate";
  
  // shorten the geolocation if present
  // http://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
  // three or four dp would do, lets go with three for now
  if (req.location && req.location.geo) {
    if (req.location.geo.lat) req.location.geo.lat = Math.round(req.location.geo.lat*1000)/1000
    if (req.location.geo.lon) req.location.geo.lon = Math.round(req.location.geo.lon*1000)/1000
  } else {
    // TODO worth trying to grab location via IP or anything else?
  }

  if (req.doi) req.doi = decodeURIComponent(req.doi); // just a clean-up
  if (req.dom) {
    console.log('dom of length ' + req.dom.length + ' was provided, but removed before saving');
    delete req.dom;
  }
  req.receiver = CLapi.internals.store.receiver(req); // is store receiver really necessary here?
  req._id = oab_request.insert(req);
  return req;
}

CLapi.internals.service.oab.scrape = function(url,content,refresh,doi) {
  return CLapi.internals.academic.catalogue.extract(url,content,refresh,doi);
}

CLapi.internals.service.oab.support = function(rid,story,uid) {
  if (story.indexOf('<script') !== -1) return false; // ignore people being naughty
  var r = oab_request.findOne(rid);
  console.log('creating oab support')
  console.log(rid)
  console.log(story)
  console.log(uid)
  if ( r.user.id !== uid && CLapi.internals.service.oab.supports(rid,uid).length === 0 ) {
    oab_request.update(rid,{$set:{count:r.count + 1}});
    var user = Meteor.users.findOne(uid);
    var s = {url:r.url,rid:r._id,type:r.type,uid:uid,username:user.username,email:user.emails[0].address,story:story}
    s._id = oab_support.insert(s);
    return s;
  } else {
    return false;
  }
}

CLapi.internals.service.oab.supports = function(rid,uid,url) {
  var matcher = {};
  if (rid && uid) {
    matcher.$and = [{uid:uid},{rid:rid}];
  } else if (rid) {
    matcher._id = rid;
  } else if (uid && url) {
    matcher.$and = [{uid:uid},{url:url}];
  } else if (uid) {
    matcher.uid = uid;
  }
  return oab_support.find(matcher).fetch();
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
  if (opts.url === undefined) return {}
  
  var ret = {availability:[],requests:[],accepts:[]};
  var already = [];
  
  console.log('OAB availability checking for sources');
  // when something is found, should we save the fact that we know where it is?
  if ( opts.type === 'data' || opts.type === undefined ) {
    // any useful places to check - append discoveries to availability
    // if found, push 'data' into already
    // {type:'data',url:<URL>}
  }
  if ( opts.type === 'article' || opts.type === undefined ) {
    var res = CLapi.internals.academic.resolve(opts.url,opts.dom);
    if (res.url) {
      ret.availability.push({type:'article',url:res.url});
      already.push('article')
    }
  }
  // TODO add availability checkers for any new types that are added to the accepts list  

  console.log('OAB availability checking for requests');
  var matcher = {url:opts.url};
  if (opts.type) matcher.type = opts.type;
  var requests = oab_request.find(matcher).fetch();
  console.log('found ' + requests.length + ' existing requests');
  for ( var r in requests ) {
    if ( already.indexOf(requests[r].type) === -1 ) {
      var rq = {
        type: requests[r].type,
        _id: requests[r]._id
      }
      rq.ucreated = opts.uid && requests[r].user && requests[r].user.id === opts.uid ? true : false;
      if (opts.uid) {
        var supported = CLapi.internals.service.oab.supports(requests[r]._id,opts.uid);
        rq.usupport = supported.length > 0 ? true : false;
      }
      ret.requests.push(rq);
      already.push(requests[r].type);
    }
  }
  
  console.log('OAB availability checking for accepts');
  var accepts = CLapi.internals.service.oab.accepts();
  for ( var a in accepts ) {
    if ( already.indexOf(accepts[a].type) === -1) ret.accepts.push(accepts[a]);
  }

  // record usage of this endpoint
  if (opts.dom) delete opts.dom;
  oab_availability.insert(opts);

  return ret;
}

CLapi.internals.service.oab.hold = function(rid,days) {
  var today = new Date().getTime();
  var date = (Math.floor(today/1000) + (days*86400)) * 1000;
  var r = oab_request.findOne(rid);
  if (r.holds === undefined) r.holds = [];
  if (r.hold) r.holds.push(r.hold);
  r.hold = {from:today,until:date};
  r.status = 'hold';
  oab_request.update(rid,{$set:{hold:r.hold,holds:r.holds,status:r.status}});
  //CLapi.internals.sendmail(); // inform requestee that their request is on hold
  return {status: 'success', data: r};
}

CLapi.internals.service.oab.refuse = function(rid,reason) {
  var today = new Date().getTime();
  var r = oab_request.findOne(rid);
  if (r.holds === undefined) r.holds = [];
  if (r.hold) r.holds.push(r.hold);
  delete r.hold;
  if (r.refused === undefined) r.refused = [];
  r.refused.push({date:today,email:r.email,reason:reason});
  r.status = 'refused';
  delete r.email;
  oab_request.update(rid,{$set:{hold:undefined,email:undefined,holds:r.holds,refused:r.refused,status:r.status}});
  //CLapi.internals.sendmail(); // inform requestee that their request has been refused
  return {status: 'success', data: r};
}

CLapi.internals.service.oab.followup = function(rid) {
  var MAXEMAILFOLLOWUP = 5; // how many followups to one email address will we do before giving up, and can the followup count be reset or overrided somehow?
  var r = oab_request.findOne(rid);
  if (r.followup === undefined) r.followup = [];
  var thisfollows = 0;
  for ( var i in r.followup ) {
    if ( r.followup[i].email === r.email) thisfollows += 1;
  }
  var today = new Date().getTime();
  var dnr = oab_dnr.findOne({email:r.email});
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
    oab_request.update(r._id,{$set:{followup:r.followup,status:'progress'}});
    return {status:'success',data:r}
  }
}

CLapi.internals.service.oab.receive = function(rid,content,url,description) {
  // TODO this currently only works via the UI, after file uploads are set as complete, this is triggered
  // an actuall call to this on the API would trigger emails and deposits for files that had already been processed
  // and also could fail on cluster deployment because only the root machine would actually be able to find the files
  var r = oab_request.findOne({receiver:rid});
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

    // email the person that provided the content, confirming receipt
    /*CLapi.internals.sendmail({
      from: mf,
      to: r.email,
      subject: w + ' submission received',
      text: "Hello " + r.email + ",\n\n" + "Thank you very much for your submission to the request at \n\nhttps://openaccessbutton.org/request/" + r._id + "\n\nWe have contacted all the people who needed access to this content to let them know you've been so helpful in making it available.\n\nThanks very much again for your support,\n\nThe Open Access Button team."
    },mu);  
    // email the person that started the request
    CLapi.internals.sendmail({
      from: mf,
      to: r.user.email,
      subject: w + ' request successful!',
      text: "Hello " + r.user.email + ",\n\n" + "Your request has been successful!\n\nThe requested content is now available - check the request page for more information.\n\nhttps://openaccessbutton.org/request/" + r._id + "\n\nThanks very much for your support,\n\nThe Open Access Button team."
    },mu);
    // email everyone who wanted it
    var wants = [];
    oab_support.find({url:r.url}).forEach(function(b) {
      var u = Meteor.users.findOne(b.user);
      var addr = u.emails[0].address;
      if (wants.indexOf(addr) === -1) wants.push(addr);
    });
    CLapi.internals.sendmail({
      from: mf,
      bcc: wants,
      subject: 'Open Access Button request successful!',
      text: "Hello!\n\n" + "A request for content that you supported has been successful!\n\nThe requested content is now available - check the request page for more information.\n\nhttps://openaccessbutton.org/request/" + r._id + "\n\nThanks very much for your support,\n\nThe Open Access Button team."
    },mu);*/
    
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
        var s = r.title ? r.title : fl;
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

    oab_request.update(r._id,{$set:{hold:undefined,received:r.received,status:'received'}});
    return {status: 'success', data: r};
  }
}

CLapi.internals.service.oab.validate = function(url,type) {
}

CLapi.internals.service.oab.template = function(template,refresh) {
  // TODO refresh should be some refresh setting - check how old they were perhaps? or just refresh all
  if (refresh || mail_template.find({service:'openaccessbutton'}).count() === 0) {
    mail_template.remove({service:'openaccessbutton'});
    var ghurl = Meteor.settings.openaccessbutton.templates_url;
    var m = CLapi.internals.tdm.extract({
      url:ghurl,
      matchers:['//OAButton/oab_static/blob/develop/emails/.*?title="(.*?[.].*?)">/gi'],
      start:'<table class="files',
      end:'</table'
    });
    var fls = [];
    for ( var fm in m.matches ) fls.push(m.matches[fm].result[1]);
    var flurl = ghurl.replace('github.com','raw.githubusercontent.com').replace('/tree','');
    for ( var f in fls ) {
      console.log(flurl+'/'+fls[f]);
      var content = Meteor.http.call('GET',flurl + '/' + fls[f]).content;
      CLapi.internals.mail.template(undefined,{filename:fls[f],service:'openaccessbutton',content:content});
    }
  }
  if (template) {
    return CLapi.internals.mail.template(template);
  } else {
    return CLapi.internals.mail.template({service:'openaccessbutton'});
  }
}

CLapi.internals.service.oab.substitute = function(content,vars,markdown) {
  // wraps the mail constructor
  if (vars && vars.user) {
    var u = CLapi.internals.accounts.retrieve(vars.user.id);
    if (u) {
      vars.profession = u.service.openaccessbutton.profile.profession ? u.service.openaccessbutton.profile.profession : '';
      vars.affiliation = u.service.openaccessbutton.profile.affiliation ? u.service.openaccessbutton.profile.affiliation : '';
    }
    vars.userid = vars.user.id;
    vars.fullname = u && u.profile && u.profile.name ? u.profile.name : '';
    vars.username = vars.user.username ? vars.user.username : vars.user.email;
    if (!vars.fullname) vars.fullname = vars.username;
    vars.useremail = vars.user.email
  }
  // if on dev api should replace occurrences of https://openaccessbutton.org with http://oab.test.cottagelabs.com
  return CLapi.internals.mail.substitute(content,vars,markdown);
}

CLapi.internals.service.oab.sendmail = function(opts) {
  // who could we ever want to email?
  // the request creator, the request author contact, the request supporters (bcc)
  // a particular account email address? a particular set of email accounts (bcc)
  
  // opts needs a template name, and some vars to load into it
  // what are convenience vars to swap in? userid, username, useremail, authoremail, etc?
  // opts.to should be an email address to send to, or perhaps should be set depending on template?
  if (!opts.subject) opts.subject = 'Hello from Open Access Button';
  if (!opts.from) opts.from = Meteor.settings.openaccessbutton.requests_from;

  if (opts.bcc && opts.bcc === 'ALL') {
    var emails = [];
    var users = Meteor.users.find({"roles.openaccessbutton":{$exists:true}});
    users.forEach(function(user) {
      emails.push(user.emails[0].address);
    });
    opts.bcc = emails;
  }
  
  if (opts.template === 'status_received') {
    // special cases that send multiple emails will have to be coded here specifically
    // the main one should be the one to send to the creator of the request
    // also get and send status_received_author and status_received_supporters
    //CLapi.internals.sendmail(ml,mu);
  }

  return CLapi.internals.mail.send(opts,Meteor.settings.openaccessbutton.mail_url);
}

CLapi.internals.service.oab.cron = function() {
  // look for any request in progress and see how far past progress date it is
  // so need to be able to check when it was set to in progress!
  // send a chase email to the author in question - if not already refused or put on hold or author joined dnr list
  // so call the followup function for each relevant request
  
  // also need to email users who have requests at help status
  // ask them to contribute more info
  
  // there are also various auto email checks that the oabutton team want added. add them here
}

if ( Meteor.settings.cron.oabutton ) {
  SyncedCron.add({
    name: 'oabutton',
    schedule: function(parser) { return parser.recur().every(1).day(); }, // what should schedule of this be?
    job: CLapi.internals.service.oabutton.cron
  });
}

