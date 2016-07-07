
// the oabutton API.

// TODO: add a "this is the wrong thing route"
// TODO: add a "I followed this URL route" which should work for badges too, and URLs of content we can direct people to
// TODO: add a route for requestee to say "this content was good/bad yes/no"

OAB_DNR = new Mongo.Collection("oabutton_dnr");

CLapi.addRoute('service/oabutton/embed/request/:rid', {
  get: {
    action: function() {
      var rid = this.urlParams.rid;
      var b = OAB_Request.findOne(rid);
      if (b) {
        b.count = OAB_Blocked.find({url:b.url}).count();
        var which = b.type === 'data' ? 'data' : 'access';
        var title = b.url;
        if ( b.metadata && b.metadata.title ) title = b.metadata.title;
        var template = '<div style="width:800px;padding:0;margin:0;"> \
  <div style="padding:0;margin:0;float:left;width:150px;height:200px;background-color:white;border:2px solid #398bc5;;"> \
    ' + (b.type === 'data' ? '<img src="//opendatabutton.org/static/ODB_Logo_Transparent_311.png" style="height:100%;width:100%;">' : 
    '<img src="//openaccessbutton.org/static/oabutton_logo_final200.png" style="height:100%;width:100%;">') + 
  '</div> \
  <div style="padding:0;margin:0;float:left;width:400px;height:200px;background-color:#398bc5;;"> \
    <div style="height:166px;"> \
      <p style="margin:2px;color:white;font-size:30px;text-align:center;"> \
        <a target="_blank" href="https://open' + which + 'button.org/request/' + rid + '" style="color:white;font-family:Sans-Serif;"> \
          Open ' + which.substring(0,1).toUpperCase() + which.substring(1,which.length) + ' Button \
        </a> \
      </p> \
      <p style="margin:2px;color:white;font-size:16px;text-align:center;font-family:Sans-Serif;"> \
        Request for ' + (b.type === 'data' ? 'data supporting' : '') + 'the article <br> \
        <a target="_blank" id="odb_article" href="https://open' + which + 'button.org/request/' + rid + '" style="font-style:italic;color:white;font-family:Sans-Serif;"> \
        ' + title + '</a> \
      </p> \
    </div> \
    <div style="height:30px;background-color:#f04717;"> \
      <p style="text-align:center;font-size:16px;margin-right:2px;padding-top:1px;"> \
        <a target="_blank" style="color:white;font-family:Sans-Serif;" href="https://open' + which + 'button.org/request/' + rid + '"> \
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
CLapi.addRoute('service/oabutton/embed/blocked/:bid', {
  get: {
    action: function() {
      var bid = this.urlParams.bid;
      var b = OAB_Blocked.findOne(bid);
      if (b) {
        var title = b.url;
        if ( b.metadata && b.metadata.title ) title = b.metadata.title;
        var could = '';
        if (b.story) could = ' so that I can ' + b.story;
        var template = '<div style="width:800px;padding:0;margin:0;"> \
  <div style="padding:0;margin:0;float:left;width:150px;height:200px;background-color:white;border:2px solid #398bc5;;"> \
    <img src="https://data.openaccessbutton.org/static/ODB_Logo_Transparent_311.png" style="height:100%;width:100%;"> \
  </div> \
  <div style="padding:0;margin:0;float:left;width:400px;height:200px;background-color:#398bc5;;"> \
    <div style="height:166px;"> \
      <p style="margin:2px;color:white;font-size:30px;text-align:center;"> \
        <a target="_blank" href="https://opendatabutton.org/story/' + bid + '" style="color:white;font-family:Sans-Serif;"> \
          Open Data Button \
        </a> \
      </p> \
      <p style="margin:2px;color:white;font-size:16px;text-align:center;font-family:Sans-Serif;"> \
        <a target="_blank" id="odb_article" href="https://opendatabutton.org/story/' + bid + '" style="color:white;font-family:Sans-Serif;"> \
        I need access to the supporting data for ' + title + ' \
      ' + could + '</p> \
    </div> \
  </div> \
  <div style="padding:0;margin:0;float:left;width:200px;height:200px;background-color:#212f3f;"> \
    <p style="text-align:center;color:white;font-size:14px;font-family:Sans-Serif;"> \
      Let\'s increase access to research and supporting data, to enable more people to do great things with the shared knowledge of our society. \
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

CLapi.addRoute('service/oabutton/query/request', {
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
CLapi.addRoute('service/oabutton/query/blocked', {
  get: {
    action: function() {
      var rt = '/oabutton/blocked/_search';
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

CLapi.addRoute('service/oabutton', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'the new oabutton API. details coming soon'} };
    }
  }
});

// straightforward as possible route to stop getting sent emails from oabutton
CLapi.addRoute('service/oabutton/dnr/:email', {
  get: {
    action: function() {
      OAB_DNR.insert({email:this.urlParams.email, createdAt: new Date().getTime()});
      // when an email goes onto the dnr, check for any live requests with that email address and delete them? Or set them to impossible?
      var reqs = OAB_Request.find({email:this.urlParams.email});
      for ( var i in reqs ) { // or however we iterate the requests
        var r = reqs[i];
        if (r.refused === undefined) r.refused = [];
        r.refused.push({email:this.urlParams.email,date: new Date().getTime() });
        OAB_Request.update(r._id,{$set:{refused:r.refused,email:undefined}});
      }
      return {status: 'success', data: {info: 'Email address ' + this.urlParams.email + ' is no longer contactable by open access button.'} };
    }
  }
});

// who can register for oabutton? - plugin currently allows register, but should move to only the site allowing register
CLapi.addRoute('service/oabutton/register', {
  get: {
    action: function() {
      if (this.queryParams) {
        return CLapi.internals.service.oabutton.register(this.queryParams);
      } else {
        return CLapi.internals.service.oabutton.register(this.request.body);
      }
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.register(this.request.body);
    }
  }
});

// auth is required for posting into blocked
CLapi.addRoute('service/oabutton/blocked', {
  get: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user ) ) {
        return {status: 'success', data: 'You have access :)'}
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  },
  post: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user) ) {
        return CLapi.internals.service.oabutton.blocked(this.request.body,this.userId);
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  },
  delete: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      if ( CLapi.cauth('root',this.user ) ) {
        return CLapi.internals.mongo.delete(OAB_Blocked);
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  }
});
CLapi.addRoute('service/oabutton/blocked/:bid', {
  get: {
    action: function() {
      var b = OAB_Blocked.findOne(this.urlParams.bid);
      if (b) {
        return {status: 'success', data: b}
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  },
  post: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user ) ) {
        var rec = this.request.body;
        rec._id = this.urlParams.bid;
        return CLapi.internals.service.oabutton.blocked(rec,this.userId);      
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  },
  delete: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      if ( CLapi.cauth('root',this.user ) ) {
        return CLapi.internals.mongo.delete(OAB_Blocked,this.urlParams.bid);
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  }
});

// what auth is required for triggering requests? - plugin actually triggers via blocked notification with emails in it
CLapi.addRoute('service/oabutton/request', {
  post: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('openaccessbutton.user',this.user ) ) {
        var metadata;
        var type = this.queryParams.type;
        var url = this.queryParams.url;
        var email = this.queryParams.email;
        if (this.request.body && this.request.body.url) url = this.request.body.url;
        if (this.request.body && this.request.body.email) email = this.request.body.email;
        if (this.request.body && this.request.body.metadata) metadata = this.request.body.metadata;
        if (this.request.body && this.request.body.type) type = this.request.body.type;
        if (type === undefined) type = 'article';
        return CLapi.internals.service.oabutton.request(type,url,email,this.userId,metadata);
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      if ( CLapi.cauth('root',this.user ) ) {
        return CLapi.internals.mongo.delete(OAB_Request);
      } else {
        return {status: 'error', data: 'You are not a member of the necessary group'}        
      }
    }
  }
});
CLapi.addRoute('service/oabutton/request/:rid', {
  get: {
    action: function() {
      var b = OAB_Request.findOne(this.urlParams.rid);
      if (b) {
        b.count = OAB_Blocked.find({url:b.url}).count();
        if (b.receiver) delete b.receiver;
        return {status: 'success', data: b}
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}
      }
    }
  },
});

CLapi.addRoute('service/oabutton/request/:rid/hold/:days', {
  get: {
    action: function() {
      var days = parseInt(this.urlParams.days);
      if ( days > 28 ) days = 28;
      return CLapi.internals.service.oabutton.hold(this.urlParams.rid,days);
    }
  }
});

// followup?

CLapi.addRoute('service/oabutton/receive/:rid', { 
  post: {
    action: function() {
      var content;
      if ( this.request.json ) {
        var url = this.request.json.url;
        var res = Meteor.http.call('GET',url);
        content = res.content;
      } else if ( false ) {
        // check for a form post?
      } else {
        content = this.request.body;
      }
      return CLapi.internals.service.oabutton.receive(this.urlParams.rid,content);
    }
  }
});

CLapi.addRoute('service/oabutton/refuse/:rid', { 
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.refuse(this.urlParams.rid,this.queryParams.reason);
    }
  }
});

CLapi.addRoute('service/oabutton/status', {
  get: {
    action: function () {
      return CLapi.internals.service.oabutton.status(this.request.body.url,this.request.body.type);
    }
  }
});

CLapi.addRoute('service/oabutton/stats', {
  get: {
    action: function () {
      return CLapi.internals.service.oabutton.stats();
    }
  }
});

CLapi.addRoute('service/oabutton/export/:what', {
  roleRequired:'openaccessbutton.admin',
  get: {
    action: function () {
      var records;
      if (this.urlParams.what === 'users') records = Meteor.users.find({'roles.openaccessbutton':{$exists:true}}, {fields: {emails:1,profile:1,roles:1,'service.openaccessbutton':1} }).fetch();
      if (this.urlParams.what === 'blocked') records = OAB_Blocked.find().fetch();
      if (this.urlParams.what === 'request') records = OAB_Request.find().fetch();
      if (this.queryParams.format === 'csv') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/csv'
          },
          body: CLapi.internals.convert.json2csv(undefined,undefined,records)
        }
      } else {
        return records;
      }
    }
  }
});


CLapi.internals.service.oabutton = {};

CLapi.internals.service.oabutton.stats = function() {
  return {
    article: {
      blocks: {
        total: OAB_Blocked.find({type:'article'}).count(),
        test: OAB_Blocked.find({$and:[{type:'article'},{test:true}]}).count(),
        users: OAB_Blocked.aggregate( [ { $match: { type: "article"}  }, { $group: { _id: "$user"}  } ] ).length
      },
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
      blocks: {
        total: OAB_Blocked.find({type:'data'}).count(),
        test: OAB_Blocked.find({$and:[{type:'data'},{test:true}]}).count(),
        users: OAB_Blocked.aggregate( [ { $match: { type: "data"}  }, { $group: { _id: "$user"}  } ] ).length
      },
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

CLapi.internals.service.oabutton.register = function(data) {
  // TODO this user creation code stuff should go into one place - see the CL accounts app
  var user = Meteor.users.findOne({'emails.address':data.email});
  var userId;
  if ( !user ) {
    var password = Random.hexString(30);
    console.log('generated a password for oabutton user' + password);
    userId = Accounts.createUser({email:data.email,password:password});
    console.log("CREATED userId = " + userId);
    var apikey = Random.hexString(30);
    var apihash = Accounts._hashLoginToken(apikey);
    Meteor.users.update(userId, {$set: {'username':data.username,'service':{'openaccessbutton':{'profession':data.profession,'signup':'api'}},'security':{'httponly':Meteor.settings.public.loginState.HTTPONLY_COOKIES}, 'api': {'keys': [{'key':apikey, 'hashedToken': apihash, 'name':'default'}] }, 'emails.0.verified': true}});
    Roles.addUsersToRoles(userId, 'user', 'openaccessbutton');
    return {status: "success", data: {apikey:apikey}};
  } else if ( CLapi.cauth('openaccessbutton.user',user) === false ) {
    // user exists but is not yet in openaccessbutton group
    userId = user._id;
    if ( user.service === undefined ) user.service = {};
    if ( user.service.openaccessbutton === undefined ) user.service.openaccessbutton = {'signup':'api','hadaccount':'already'}
    if (data.profession) user.service.openaccessbutton.profession = data.profession;
    var setter = {'service':user.service};
    if (data.username && !user.username) setter.username = data.username;
    Meteor.users.update(userId, {$set: setter});
    Roles.addUsersToRoles(userId, 'user', 'openaccessbutton');
    return {status: "success", data: {apikey:user.api.keys[0].key}};
  } else {
    return {statusCode: 403, body: {status: "error", info: 'Openaccessbutton/opendatabutton user account already exists for that email address, registration cannot be completed.'}};
  }
}

CLapi.internals.service.oabutton.blocked = function(data,user) {
  console.log('Creating oabutton block notification');
  console.log(data);
  var u = Meteor.users.findOne(user);
  var username = u.username;
  if (u.username === undefined) username = u.emails[0].address;
  var profession;
  if (u.service && u.service.openaccessbutton && u.service.openaccessbutton.profession) profession = u.service.openaccessbutton.profession;
  var event = {user:user, username:username, profession:profession, createdAt: new Date().getTime()};
  if (u.service && u.service.openaccessbutton && u.service.openaccessbutton.test) event.test = true;
  if (data.url !== undefined) event.url = data.url;
  if (data.metadata !== undefined) event.metadata = data.metadata; // should be bibjson title, journal, identifier DOI, author, etc
  if (data.story !== undefined) event.story = data.story;
  if (data.location !== undefined) event.location = data.location; // location shuold be {geo: {lat: VAL, lon: VAL}}  
  if (data.plugin !== undefined) {
    event.plugin = data.plugin; // should be chrome,firefox...
    if (data.type === undefined) {
      if (event.plugin.indexOf('odb') === 0) {
        // this is a data request
        event.type = 'data';
      } else {
        event.type = 'article';
      }
    } else {
      event.type = data.type;
    }
  }
  var status = CLapi.internals.service.oabutton.status(event.url,event.type);
  if (status.provided) {
    event.provided = status.provided; // is this worthwhile? or just have it read from status.provided?
  } else if ( data.email ) {
    var r = CLapi.internals.service.oabutton.request(event.type,data.url,data.email,user,data.metadata);
    r.data._id ? event.request = r.data._id : event.request = false;
  }
  if (status.request && !event.request) event.request = status.request._id;
  var rec;
  if (data._id) {
    rec = data._id;
    OAB_Blocked.update(rec,{$set:event});
  } else {
    rec = OAB_Blocked.insert(event);
    event._id = rec;
  }
  return {status: 'success', data: event};
}

/*
{
  createdAt: "date request was created",
  status: "moderate OR progress OR hold OR refused OR received",
  url: "url of item request is about",
  email: "email address of person to contact to request",
  receiver: "unique ID that the receive endpoint will use to accept one-time submission of content",
  type: "article OR data (OR code eventually and possibly other things)",
  metadata: {
    // the bibjson metadata object, if received from the original block notification
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
CLapi.internals.service.oabutton.request = function(type,url,email,requestee,metadata) {
  console.log('Creating oabutton request notification');
  // type is expected to be article or data but later could be code or other things. Check requests by type
  if ( typeof email === 'string' ) email = [email];
  // see if we have requested this already
  var request = OAB_Request.findOne({url:url,type:type});
  var usableemail;
  for ( var i in email ) {
    var e = email[i];
    if (!usableemail) {
      var dnr = OAB_DNR.findOne({email:e});
      if (!dnr) {
        if (request) {
          var usable = true;
          if (request.refused) {
            for ( var r in request.refused ) {
              if (request.refused[r].email === e) usable = false;
            }
          }
          if (usable) usableemail = e;
        } else {
          usableemail = e;
        }
      }
    }
  }
  if (usableemail) {
    if ( !request ) {
      var u = Meteor.users.findOne(requestee);
      var user = {id:requestee,email:u.emails[0].address};
      if (u.username) user.username = u.username;
      request = {
        status:'moderate', // if moderation not required this could go straight to progress
        type:type,
        url:url,
        email:usableemail,
        user:user,
        createdAt: new Date().getTime()
      };
      if (u.service && u.service.openaccessbutton && u.service.openaccessbutton.test) request.test = true;
      if (metadata) request.metadata = metadata;
      request.receiver = CLapi.internals.store.receiver(request);
      request._id = OAB_Request.insert(request);
    } else if (request.refused && !request.received && request.email !== usableemail) {
      request.email = usableemail;
      if (request.hold) {
        if (!request.holds) request.holds = [];
        request.holds.push(request.hold);
        delete request.hold;
      }
      request.status = 'moderate'; // if moderation not required this could go straight to progress (but then would have to trigger email too)
      OAB_Request.update(request._id,{$set:{email:request.email,hold:undefined,holds:request.holds,status:request.status}});
    }
    console.log('New oabutton request created');
    return {status: 'success', data: request}
  } else {
    if (request) {
      console.log('Could not add email to request, it was on dnr list, or had already refused. But request already exists, so returning it');
      return {status: 'success', data: request, note:'request could not be updated with provided email - it has already been added to dnr list or has already refused to provide this item'}
    } else {
      console.log('Could not create oabutton request, no usable email');
      return {status: 'error', data: 'None of the provided emails could be used to advance this request. They have either refused contact from us already or have refused to provide this content already.'}
    }
  }
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
    OAB_Blocked.find({url:r.url}).forEach(function(b) {
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

CLapi.internals.service.oabutton.status = function(url,type) {
  if (type === undefined) type = 'article';
  var ret = { 
    blocked: OAB_Blocked.find({url:url,type:type}).count(),
    request: OAB_Request.findOne({url:url,type:type}),
    availability: {}
  }
  if ( type === 'article' ) {
    // check with dissemin
    // worth checking with core?
  }
  //CLapi.internals.academic.resolve(url); 
  // TODO make sure academic resolve is updated to handle URLs as well as DOIs/IDs
  // and make sure academic resolve is updated to check oabutton requests for receied items
  if (ret.availability.url) ret.provided = ret.availability.url; // this should be a URL use tracker URL
  return ret;
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
    schedule: function(parser) { return parser.recur().every(1).second(); }, // what should schedule of this be?
    job: CLapi.internals.service.oabutton.followups
  });
}


