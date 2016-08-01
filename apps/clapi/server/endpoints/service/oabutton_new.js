
// the NEW oabutton API.

// TODO: add a "this is the wrong thing route"
// TODO: add a "I followed this URL route" which should work for badges too, and URLs of content we can direct people to
// TODO: add a route for requestee to say "this content was good/bad yes/no"

//OAB_DNR = new Mongo.Collection("oabutton_dnr");
// use dnr email as previous

// use embed request and blocked as previous

// use query request and blocked as previous

// use export, refuse, and receive/hold as previous

// use request (or whatever it becomes) create, edit, delete as before

// get rid of register endpoint, users have to sign up via the site

CLapi.addRoute('service/oab', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'The Open Access Button API. Details coming soon.'} };
    }
  }
});

// auth is required for posting into blocked
CLapi.addRoute('service/oab/request', {
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
        var keys = [];
        for ( var k in this.request) {
          keys.push(k);
        }
        var test = this.request.headers.host === 'dev.api.cottagelabs.com' ? true : false;
        return CLapi.internals.service.oabutton.blocked(this.request.body,this.userId,test);
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
CLapi.addRoute('service/oab/blocked/:bid', {
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
        var test = this.request.headers.host === 'dev.api.cottagelabs.com' ? true : false;
        return CLapi.internals.service.oabutton.blocked(rec,this.userId,test);
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



CLapi.internals.service.oab = {};

CLapi.internals.service.oab.status = function() {
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
CLapi.internals.service.oab.request = function(type,url,email,requestee,metadata,test) {
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
      if (_maketest(u,request.url,test)) request.test = true;
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

CLapi.internals.service.oab.availability = function(url,type) {
  if (type === undefined) type = 'article';
  var ret = {
    blocked: OAB_Blocked.find({url:url,type:type}).count(),
    request: OAB_Request.findOne({url:url,type:type}),
    availability: {}
  }
  if ( type === 'data' ) {
    // any useful places to check 
  }
  if ( type === 'article' ) {
    // check with dissemin
    // worth checking with core?
  }
  if (ret.request && ret.request.received) {
    var u = 'https://';
    u += type === 'data' ? 'opendatabutton.org' : 'openaccessbutton.org';
    u += '/request/' + ret.request._id;
    var s = CLapi.internals.shortlink(u);
    ret.provided = {url:'http://ctg.li/'+s.body.data}
  } 

  //CLapi.internals.academic.resolve(url); 
  // TODO make sure academic resolve is updated to handle URLs as well as DOIs/IDs
  // and make sure academic resolve is updated to check oabutton requests for receied items
  return ret;
}

