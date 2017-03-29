
// the NEW oabutton API.

// TODO: add a "I followed this URL route" which should work for badges too, and URLs of content we can direct people to

//OAB_DNR = new Mongo.Collection("oabutton_dnr");
oab_dnr = new Mongo.Collection("oab_dnr");
oab_support = new Mongo.Collection("oab_support");
oab_meta = new Mongo.Collection("oab_meta");
oab_availability = new Mongo.Collection("oab_availability"); // records use of that endpoint
oab_request = new Mongo.Collection("oab_request"); // records use of that endpoint
oab_ill = new Mongo.Collection("oab_ill"); // records our forwarding of inter library loan requests

var moment = Meteor.npmRequire('moment');

oab_dnr.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});

oab_availability.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
oab_availability.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/availability/' + this._id, doc);
});
oab_availability.before.update(function (userId, doc, fieldNames, modifier, options) {
  var d = Date.now();
  modifier.$set.updatedAt = d;
  modifier.$set.updated_date = moment(d,"x").format("YYYY-MM-DD HHmm");
});
oab_availability.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/availability/' + doc._id, doc);
});
oab_availability.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/availability/' + doc._id);
});

oab_request.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
oab_request.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/request/' + this._id, doc);
});
oab_request.before.update(function (userId, doc, fieldNames, modifier, options) {
  var d = Date.now();
  modifier.$set.updatedAt = d;
  modifier.$set.updated_date = moment(d,"x").format("YYYY-MM-DD HHmm");
});
oab_request.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/request/' + doc._id, doc);
});
oab_request.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/request/' + doc._id);
});

oab_support.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
oab_support.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/support/' + this._id, doc);
});
oab_support.before.update(function (userId, doc, fieldNames, modifier, options) {
  var d = Date.now();
  modifier.$set.updatedAt = d;
  modifier.$set.updated_date = moment(d,"x").format("YYYY-MM-DD HHmm");
});
oab_support.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/support/' + doc._id, doc);
});
oab_support.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/support/' + doc._id);
});

oab_ill.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
oab_ill.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oab/ill/' + this._id, doc);
});
oab_ill.before.update(function (userId, doc, fieldNames, modifier, options) {
  var d = Date.now();
  modifier.$set.updatedAt = d;
  modifier.$set.updated_date = moment(d,"x").format("YYYY-MM-DD HHmm");
});
oab_ill.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oab/ill/' + doc._id, doc);
});
oab_ill.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oab/ill/' + doc._id);
});

CLapi.addCollection(oab_dnr);

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

var _avail = {
  get: {
    action: function() {
      var ident = this.queryParams.doi;
      if ( this.queryParams.url ) ident = this.queryParams.url;
      if ( this.queryParams.pmid ) ident = 'pmid' + this.queryParams.pmid;
      if ( this.queryParams.pmc ) ident = 'pmc' + this.queryParams.pmc.toLowerCase().replace('pmc','');
      if ( this.queryParams.title ) ident = 'TITLE:' + this.queryParams.title;
      if ( this.queryParams.citation ) ident = 'CITATION:' + this.queryParams.citation;
      var opts = {url:ident,test:this.queryParams.test,library:this.queryParams.library}
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        // we don't require auth for availability checking, but we do want to record the user if they did have auth
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
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
      var ident = this.request.body.doi;
      if ( this.request.body.url ) ident = this.request.body.url;
      if ( this.request.body.pmid ) ident = 'pmid' + this.request.body.pmid;
      if ( this.request.body.pmc ) ident = 'pmc' + this.request.body.pmc.toLowerCase().replace('pmc','');
      if ( this.request.body.title ) ident = 'TITLE:' + this.request.body.title;
      if ( this.request.body.citation ) ident = 'CITATION:' + this.request.body.citation;
      var opts = {url:ident,test:this.request.body.test,library:this.request.body.library}
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
}
CLapi.addRoute('service/oab/availability', _avail);
CLapi.addRoute('service/oab/find', _avail);

CLapi.addRoute('service/oab/ill/:library', {
  post: {
    action: function() {
      var opts = this.request.body;
      opts.library = this.urlParams.library;
      /*if ( this.request.headers['x-apikey'] ) {
        var acc = CLapi.internals.accounts.retrieve(this.request.headers['x-apikey']);
        if (acc) {
          opts.uid = acc._id;
          opts.username = acc.username;
          opts.email = acc.emails[0].address;
        }
      }*/
      // user info is not needed, but could be collected as above
      return {status:'success',data:CLapi.internals.service.oab.ill(opts)};
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
    action: function() {
      var req = this.request.body;
      req.test = this.request.headers.host === 'dev.api.cottagelabs.com' ? true : false;
      var uid;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
        if (acc) uid = acc._id;
      }
      return CLapi.internals.service.oab.request(req,uid);
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
        var other = oab_request.find({url:r.url}).fetch();
        for ( var o in other ) {
          if (other[o]._id !== r._id && other[o].type !== r.type) r.other = other[o]._id;
        }
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
          if (this.request.body.rating !== undefined) n.rating = this.request.body.rating;
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
    roleRequired:'openaccessbutton.user',
    action: function() {
      var r = oab_request.findOne(this.urlParams.rid);
      if ( CLapi.internals.accounts.auth('openaccessbutton.admin',this.user) || this.userId === r.user.id ) oab_request.remove(this.urlParams.rid);
      // remove support? No, keep, in case the URL gets requested in future, we can match to it again perhaps
      return {}
    }
  }
});

CLapi.addRoute('service/oab/own/:rid', {
  post: {
    roleRequired:'openaccessbutton.user',
    action: function() {
      return CLapi.internals.service.oab.own(this.urlParams.rid,this.userId,this.queryParams.anonymous);
    }
  }
});

CLapi.addRoute('service/oab/support/:rid', {
  get: {
    action: function() {
      return CLapi.internals.service.oab.support(this.urlParams.rid,this.queryParams.story,this.userId);
    }
  },
  post: {
    action: function() {
      var uid;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
        if (acc) uid = acc._id;
      }
      return CLapi.internals.service.oab.support(this.urlParams.rid,this.request.body.story,uid);
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

CLapi.addRoute('service/oab/requests', {
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

CLapi.addRoute('service/oab/terms/:type/:key', {
  get: {
    roleRequired:'openaccessbutton.admin', // TODO could open this up and then just check if the type is users to check the user is admin
    action: function() {
      var idx = this.urlParams.type === 'account' ? 'clapi' : 'oab'; // TODO this entails filtering accounts to those for oab only...
      return CLapi.internals.es.terms(idx,this.urlParams.type,this.urlParams.key);
    }
  }
});

CLapi.addRoute('service/oab/minmax/:type/:key', {
  get: {
    roleRequired:'openaccessbutton.admin', // TODO could open this up and then just check if the type is users to check the user is admin
    action: function() {
      var idx = this.urlParams.type === 'account' ? 'clapi' : 'oab'; // TODO this entails filtering accounts to those for oab only...
      return CLapi.internals.es.minmax(idx,this.urlParams.type,this.urlParams.key);
    }
  }
});

CLapi.addRoute('service/oab/keys/:type', {
  get: {
    roleRequired:'openaccessbutton.admin', // TODO could open this up and then just check if the type is users to check the user is admin
    action: function() {
      var idx = this.urlParams.type === 'account' ? 'clapi' : 'oab'; // TODO this entails filtering accounts to those for oab only...
      return CLapi.internals.es.keys(idx,this.urlParams.type);
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
      return {status:'success',data:CLapi.internals.service.oab.blacklist(undefined,this.queryParams.stale)};
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

CLapi.addRoute('service/oab/receive/:rid', {
  get: {
    action: function() {
      var r = oab_request.findOne({receiver:this.urlParams.rid});
      if (r) {
        return r;
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}        
      }
    }
  },
  post: {
    action: function() {
      var r = oab_request.findOne({receiver:this.urlParams.rid});
      if (r) {
        // TODO this could receive content directly some how
        var admin;
        if (this.bodyParams.admin && ( this.request.headers['x-apikey'] || this.queryParams.apikey ) ) {
          var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
          var acc = CLapi.internals.accounts.retrieve(apikey);
          if (acc && CLapi.internals.accounts.auth('openaccessbutton.admin',acc)) admin = true;
        }
        return CLapi.internals.service.oab.receive(this.urlParams.rid,this.bodyParams.content,this.bodyParams.url,this.bodyParams.title,this.bodyParams.description,this.bodyParams.firstname,this.bodyParams.lastname,admin);
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}        
      }
    }
  }
});
CLapi.addRoute('service/oab/redeposit/:rid', {
  post: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      return CLapi.internals.service.oab.redeposit(this.urlParams.rid);
    }
  }
});
CLapi.addRoute('service/oab/receive/:rid/:holdrefuse', {
  get: {
    action: function() {
      var r = oab_request.findOne({receiver:this.urlParams.rid});
      if (r) {
        if (this.urlParams.holdrefuse === 'refuse') {
          CLapi.internals.service.oab.refuse(r._id,this.queryParams.reason);
        } else {
          if (isNaN(parseInt(this.urlParams.holdrefuse))) {
            return {statusCode: 400, body: {status: 'error', data:'Cannot parse a hold length integer out of last parameter'}};
          } else {
            CLapi.internals.service.oab.hold(r._id,parseInt(this.urlParams.holdrefuse));
          }
        }
        return {status:'success'};
      } else {
        return {statusCode: 404, body: {status: 'error', data:'404 not found'}}        
      }
    }
  }
});

CLapi.addRoute('service/oab/dnr', {
  get: {
    action: function() {
      if (!this.queryParams.email) return {status:'error',info:'you need to provide an email'};
      var d = {};
      d.dnr = CLapi.internals.service.oab.dnr(this.queryParams.email);
      if (!d.dnr && this.queryParams.user) {
        var u = CLapi.internals.accounts.retrieve(this.queryParams.user);
        if (u.emails[0].address === this.queryParams.email) d.dnr = 'user';
      }
      if (!d.dnr && this.queryParams.request) {
        var r = oab_request.findOne(this.queryParams.request);
        if (r.user.email === this.queryParams.email) d.dnr = 'creator';
        if (!d.dnr) {
          var supports = oab_support.find({rid:this.queryParams.request}).fetch();
          for ( var s in supports ) {
            if (supports[s].email === this.queryParams.email) d.dnr = 'supporter';
          }
        }
      }
      if (!d.dnr && this.queryParams.validate) {
        // check if this is a valid email address - create and call an internals mail function that calls to mailgun email validator
        d.validation = CLapi.internals.mail.validate(this.queryParams.email);
        if (!d.validation.is_valid) d.dnr = 'invalid';
      }
      return {status:'success',data:d};
    }
  },
  post: {
    action: function() {
      var e = this.queryParams.email ? this.queryParams.email : this.request.body.email;
      var refuse = this.queryParams.refuse && (this.queryParams.refuse === 'false' || this.queryParams.refuse === false) ? false : true;
      if (e) {
        return {status:'success',data:CLapi.internals.service.oab.dnr(e,true,refuse)};
      } else {
        return {status:'error',info:'you need to provide an email'}
      }
    }    
  }
});

CLapi.addRoute('service/oab/bug', {
  post: {
    action: function() {
      // this.request.body - holds hte form info. what will we do with it
      console.log(this.request.body);
      return this.request.body;
      /* submit general feedback / uninstall / dnr feedback to zendesk
         submit general bug reports to github issues & notify help@openaccessbutton.org (to make it easy to follow up and thank)
         submit "wrong link" info to github issue & notify help@openaccessbutton.org (to make it easy to follow up and thank)
         send a notification about "why you can't share something" to requests@openaccessbutton.org. & save data alongside request data in request system
       */
      /*return {
        statusCode: 302,
        headers: {
          'Content-Type': 'text/plain',
          'Location': 'https://openaccessbutton.org/bug#defaultthanks'
        },
        body: 'Location: ' + 'https://openaccessbutton.org/bug#defaultthanks'
      };*/
    }    
  }
});

CLapi.addRoute('service/oab/job', {
  post: {
    roleRequired: 'openaccessbutton.admin', // later could be opened to other oab users, with some sort of quota / limit
    action: function() {
      console.log(this.request.body) // will contain list and name
      var list = this.request.body.list ? this.request.body.list : this.request.body;
      // should be a json list extracted from a csv, with at least one of columns named url, doi, pmid, pmcid, title - check columns?
      // run an availability check for all in list - could be configured to other actions
      // var jid = CLapi.internals.job.create({user:this.userId,service:'openaccessbutton',method:CLapi.internals.service.oab.availability,name:"oab_availability",list:list});
      return this.request.body;//jid;
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

CLapi.internals.service.oab.dnr = function(email,add,refuse) {
  if (email === undefined && add === undefined) return oab_dnr.find().fetch();
  var ondnr = oab_dnr.findOne({email:email});
  if (add && !ondnr) {
    oab_dnr.insert({email:email});
    // also set any requests where this author is the email address to refused - can't use the address!
    if (refuse) {
      var rqs = oab_request.find({email:email}).fetch();
      for ( var req in rqs ) CLapi.internals.service.oab.refuse(req._id,'Author DNRd their email address');
    }
  }
  return ondnr !== undefined || add === true;
}

CLapi.internals.service.oab.blacklist = function(url,stale) {
  if (url !== undefined && (url.length < 4 || url.indexOf('.') === -1) ) return false;
  var bl = CLapi.internals.use.google.sheets.feed(Meteor.settings.openaccessbutton.blacklist_sheetid,stale);
  var blacklist = [];
  for ( var i in bl ) blacklist.push(bl[i].url);
  if (url) {
    for ( var b in blacklist ) {
      if (url.indexOf(blacklist[b]) !== -1) return true;
    }
    return false;
  } else {
    return blacklist;
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
  console.log('oabutton creating new request');
  var dom;
  if (req.dom) {
    dom = req.dom;
    console.log('dom of length ' + req.dom.length + ' was provided, but removed before saving');
    delete req.dom;
  }
  if (JSON.stringify(req).indexOf('<script') !== -1) return false; // naughty catcher
  if (req.type === undefined) req.type = 'article';
  // TODO it is now possible to have a request just from a doi/pmid/pmcid/title/citation, so what will be known about that?
  var exists = oab_request.findOne({url:req.url,type:req.type});
  if (exists) return exists;
  // a blacklisted URL should not be sent to request, because the availability check would have returned 400
  // the request endpoint will accept blacklisted URLs, but here they just get bounced to false
  // we could do something else with them here if we wanted, but for now just false them
  if (!req.test && CLapi.internals.service.oab.blacklist(req.url)) return false;
  console.log('Creating oabutton request notification');
  // it was noted that we sometimes had new requests that were duplicates of others from a few seconds earlier
  // it is possible that scraping a page and creating the full request is a slow prcoess in some situations
  // so now instead we create the request immediately, then update it with more info once collected
  // also when loading old requests from old data, it is possible the request already has an id
  var rid;
  if (req._id) {
    var check = oab_request.findOne(req._id);
    if (check) {
      rid = req._id;
    } else {
      rid = oab_request.insert({url:req.url,type:req.type,_id:req._id});
    }
  }
  if (rid === undefined) rid = oab_request.insert({url:req.url,type:req.type});
  var user = uid ? Meteor.users.findOne(uid) : undefined;
  if (req.user === undefined && user) {
    var un = user.profile && user.profile.firstname ? user.profile.firstname : user.username;
    if (!un) un = user.emails[0].address;
    req.user = {
      id: user._id,
      username: un,
      email: user.emails[0].address
    }
    if (user.profile) {
      req.user.firstname = user.profile.firstname;
      req.user.lastname = user.profile.lastname;
    }
    try {req.user.affiliation = user.service.openaccessbutton.profile.affiliation; } catch(err) {}
    try {req.user.profession = user.service.openaccessbutton.profile.profession; } catch(err) {}
  }
  req.count = 1;
  
  // what of that info can be used to start a request automatically?
  if (!req.title || !req.email || !req.keywords) { // worth scraping on any other circumstance?
    var meta = CLapi.internals.academic.catalogue.extract(req.url,dom,undefined,req.doi); // TODO what if there is not a url available?
    req.keywords = meta && meta.keywords ? meta.keywords : [];
    req.title = meta && meta.title ? meta.title : "";
    req.doi = meta && meta.doi ? meta.doi : "";

    req.email = meta && meta.email && meta.email.length > 0 ? meta.email[0] : "";
    if (req.email && CLapi.internals.service.oab.dnr(req.email)) req.email = "";
    
    // some optional extras that the extract can return
    req.author = meta && meta.author ? meta.author : [];
    req.journal = meta && meta.journal ? meta.journal : "";
    req.issn = meta && meta.issn ? meta.issn : "";
    req.publisher = meta && meta.publisher ? meta.publisher : "";
  }

  req.status = !req.title || !req.email || req.user === undefined ? "help" : "moderate";
  
  // shorten the geolocation if present
  // http://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
  // three or four dp would do, lets go with three for now
  if (req.location && req.location.geo) {
    if (req.location.geo.lat) req.location.geo.lat = Math.round(req.location.geo.lat*1000)/1000
    if (req.location.geo.lon) req.location.geo.lon = Math.round(req.location.geo.lon*1000)/1000
  } else {
    // TODO worth trying to grab location via IP or anything else?
  }

  if (req.doi) req.doi = decodeURIComponent(req.doi);
  req.receiver = CLapi.internals.store.receiver(req); // is store receiver really necessary here?
  oab_request.update(rid,{$set:req});
  req._id = rid;
  CLapi.internals.mail.send({
    from: 'requests@openaccessbutton.org',
    to: ['natalianonori@gmail.com'],
    subject: 'New request created ' + req._id,
    text: (Meteor.settings.dev ? 'https://dev.openaccessbutton.org/request/' : 'https://openaccessbutton.org/request/') + req._id
  });
  return req;
}

CLapi.internals.service.oab.own = function(rid,uid,anonymous) {
  var req = oab_request.findOne(rid);
  var user = uid ? Meteor.users.findOne(uid) : undefined;
  if (!req || !user) {
    return false;
  } else {
    if (req.user === undefined && user) {
      if (anonymous && CLapi.internals.accounts.auth('openaccessbutton.admin',user)) {
        req.user = {
          admin: user._id,
          username: 'anonymous'
        }
      } else {
        var un = user.profile && user.profile.firstname ? user.profile.firstname : user.username;
        if (!un) un = user.emails[0].address;
        req.user = {
          id: user._id,
          username: un,
          email: user.emails[0].address
        }
        if (user.profile) {
          req.user.firstname = user.profile.firstname;
          req.user.lastname = user.profile.lastname;
        }
        try {req.user.affiliation = user.service.openaccessbutton.profile.affiliation; } catch(err) {}
        try {req.user.profession = user.service.openaccessbutton.profile.profession; } catch(err) {}
      }
      oab_request.update(rid,{$set:{user:req.user}});
    }
    return req;
  }
}

CLapi.internals.service.oab.scrape = function(url,content,refresh,doi) {
  var s = CLapi.internals.academic.catalogue.extract(url,content,refresh,doi);
  var email;
  var foundauthor = false;
  if (s.email) {
    for (var e in s.email) {
      var isauthor = false;
      if (s.author && !foundauthor) {
        for ( var a in s.author ) {
          if (s.author[a].family && s.email[e].toLowerCase().indexOf(s.author[a].family.toLowerCase()) !== -1) {
            isauthor = true;
            foundauthor = true;
          }
        }
      }
      if ( ( email === undefined || isauthor ) && !CLapi.internals.service.oab.dnr(s.email[e])) email = s.email[e];
    }
  }
  s.email = email;
  return s;
}

CLapi.internals.service.oab.support = function(rid,story,uid) {
  if (story && story.indexOf('<script') !== -1) return false; // ignore people being naughty
  var r = oab_request.findOne(rid);
  console.log('creating oab support');
  if (uid === undefined) {
    var anons = {url:r.url,rid:r._id,type:r.type,username:'anonymous',story:story}
    anons._id = oab_support.insert(anons);
    return anons;
  } else if ( r.user && r.user.id !== uid && CLapi.internals.service.oab.supports(rid,uid).length === 0 ) {
    oab_request.update(rid,{$set:{count:r.count + 1}});
    var user = Meteor.users.findOne(uid);
    var s = {url:r.url,rid:r._id,type:r.type,uid:uid,username:user.username,email:user.emails[0].address,story:story}
    if (user.profile) {
      s.firstname = user.profile.firstname;
      s.lastname = user.profile.lastname;
    }
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
    matcher.rid = rid;
  } else if (uid && url) {
    matcher.$and = [{uid:uid},{url:url}];
  } else if (uid) {
    matcher.uid = uid;
  }
  return oab_support.find(matcher).fetch();
}

CLapi.internals.service.oab.ill = function(opts) {
  if (opts.library === 'imperial') {
    // TODO for now we are just going to send an email when a user creates an ILL
    // until we have a script endpoint at the library to hit
    // library POST URL: https://www.imperial.ac.uk/library/dynamic/oabutton/oabutton3.php
    CLapi.internals.mail.send({
      from: 'requests@openaccessbutton.org',
      to: ['mark@cottagelabs.com','joe@righttoresearch.org','s.barron@imperial.ac.uk'],
      subject: 'EXAMPLE ILL TRIGGER',
      text: JSON.stringify(opts,undefined,2)
    });
    CLapi.internals.service.oab.sendmail({template:{filename:'imperial_confirmation_example.txt'},to:opts.id});
    Meteor.http.call('POST','https://www.imperial.ac.uk/library/dynamic/oabutton/oabutton3.php',{data:opts});
  }
  // TODO as we add more libraries add their forwarding endpoints here
  var illid = oab_ill.insert(opts);
  return illid;
}

CLapi.internals.service.oab.ill_progress = function() {
  // TODO need a function that can lookup ILL progress from the library systems some how
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
  opts.refresh = true; // forcing brand new lookups every time for the moment... 
  if (opts.url) {
    if (opts.url.indexOf('10.1') === 0) {
      opts.doi = opts.url;
      opts.url = 'https://doi.org/' + opts.url;
    } else if ( opts.url.toLowerCase().indexOf('pmc') === 0 ) {
      opts.url = 'http://europepmc.org/articles/PMC' + opts.url.toLowerCase().replace('pmc','');
    } else if ( opts.url.length < 10 && opts.url.indexOf('.') === -1 && !isNaN(parseInt(opts.url)) ) {
      opts.url = 'https://www.ncbi.nlm.nih.gov/pubmed/' + opts.url;
    }
    // could still be citation string or title, so will still try lookup on that in the url...
  }
  if (!opts.url) {
    var bu;
    if (opts.citation) bu = 'CITATION:'+opts.citation;
    if (opts.title) bu = 'TITLE:'+opts.title;
    if (opts.pmid) bu = 'https://www.ncbi.nlm.nih.gov/pubmed/' + opts.pmid;
    if (opts.pmc) bu = 'http://europepmc.org/articles/PMC' + opts.pmc.toLowerCase().replace('pmc','');
    if (opts.pmcid) bu = 'http://europepmc.org/articles/PMC' + opts.pmcid.toLowerCase().replace('pmc','');
    if (opts.doi) bu = 'https://doi.org/' + opts.doi.indexOf('doi.org/') !== -1 ? opts.doi.split('doi.org/')[1] : opts.doi;
    if (bu) opts.url = bu;
  }
  if (opts.url === undefined) return {} // opts.url could actually be doi, pmid, pmc, title, citation - what to do about how we store each?
  
  var ret = {match:opts.url,availability:[],requests:[],accepts:[],meta:{article:{},data:{}}};
  var already = [];
  
  console.log('OAB availability checking for sources');
  
  var meta;
  if (opts.library) {
    ret.library = {institution:opts.library,primo:{}}
    meta = CLapi.internals.academic.catalogue.extract(opts.url,opts.dom);
    if (meta.title) {
      ret.library.title = meta.title;
      var tqr = 'title,exact,'+meta.title.replace(/ /g,'+');
      var lib = CLapi.internals.use.exlibris.primo(tqr,undefined,undefined,opts.library);
      if (lib.data && lib.data.length > 0) {
        ret.library.primo.title = {query:tqr,result:lib.data};
        ret.library.local = [];
        for ( var l in lib.data ) {
          if (lib.data[l].library) {
            ret.library.local.push(lib.data[l]);
          } else if ( lib.data[l].repository && ret.library.repository === undefined ) {
            ret.library.repository = lib.data[l];
          }
        }
      }
    }
    if ( meta.journal ) {
      // exlibris may only tell us they have access to the journal, not every article. So if not found 
      // do a check for journal availability
      ret.library.journal = {title:meta.journal};
      var jqr = 'rtype,exact,journal&query=swstitle,begins_with,'+meta.journal.replace(/ /g,'+')+'&sortField=stitle';
      var jrnls = CLapi.internals.use.exlibris.primo(jqr,undefined,50,opts.library);
      if (jrnls.data && jrnls.data.length > 0) {
        ret.library.primo.journal = {query:jqr,result:jrnls.data};
        for ( var j in jrnls.data ) {
          var jrnl = jrnls.data[j];
          var inj = ret.library.journal.title.toLowerCase().replace(/[^a-z]/g,'');
          var rnj = jrnl.title.toLowerCase().replace(/[^a-z]/g,'');
          if (rnj.indexOf(inj) === 0 && rnj.length < inj.length+3) {// && jrnl.library) {
            if (jrnl.library) {
              ret.library.journal = jrnl;
            } else {
              ret.library.journal.library = true;
            }
            break;
          }
        }
      }
    }
  }
  
  opts.discovered = {article:false,data:false};
  opts.source = {article:false,data:false};
  if ( opts.type === 'data' || opts.type === undefined ) {
    // any useful places to check - append discoveries to availability
    // once it is possible, check the previous availabilties as below for articles
    // if found, push 'data' into already
    // {type:'data',url:<URL>}
    // discovered.data = url;
  }
  if ( opts.type === 'article' || opts.type === undefined ) {
    var url;
    if (opts.refresh !== true && opts.url) {
      var avail = oab_availability.findOne({$and:[{'url':opts.url},{'discovered':{$exists:true}},{'discovered.article':{$ne:false}}]});
      if (avail && !CLapi.internals.service.oab.blacklist(avail.discovered.article,60000)) {
        console.log('found in previous availabilities ' + opts.url + ' ' + avail.url + ' ' + avail.discovered.article);
        url = avail.discovered.article;
        if (avail.source && avail.source.article) ret.meta.article.source = avail.source.article;
      }
    }
    if (url === undefined) {
      var res = CLapi.internals.academic.resolve(opts.url,opts.dom); // opts.url could actually be a pmid, pmc, or doi - this checks oabutton for received requests too
      ret.meta.article.doi = res.doi;
      ret.meta.article.source = res.source;
      ret.meta.article.title = res.title;
      ret.meta.article.journal_url = res.journal_url;
      ret.meta.article.blacklist = res.blacklist;
      url = res.url ? res.url : undefined;
      if (url !== undefined && !res.journal_url) opts.source.article = res.source;
    }
    if (url !== undefined && !ret.meta.article.journal_url) {
      ret.availability.push({type:'article',url:url});
      already.push('article');
      opts.discovered.article = url;
    }
  }
  // TODO add availability checkers for any new types that are added to the accepts list  

  //console.log('OAB availability checking for requests');
  // NOTE this won't list successful requests because anything already received will have been found above in the availability check
  if (opts.url.indexOf('http') !== 0 && ret.meta.article && ret.meta.article.doi) opts.url = 'https://doi.org/' + ret.meta.article.doi;
  var matcher = {url:opts.url};
  if (opts.type) matcher.type = opts.type;
  var requests = oab_request.find(matcher).fetch();
  //console.log('found ' + requests.length + ' existing requests');
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
  
  //console.log('OAB availability checking for accepts');
  var accepts = CLapi.internals.service.oab.accepts();
  for ( var a in accepts ) {
    if ( already.indexOf(accepts[a].type) === -1) ret.accepts.push(accepts[a]);
  }

  // record usage of this endpoint
  if (opts.dom) delete opts.dom;
  if (opts.nosave !== true) oab_availability.insert(opts);

  return ret;
}
CLapi.internals.service.oab.find = CLapi.internals.service.oab.availability;

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

CLapi.internals.service.oab.receive = function(rid,content,url,title,description,firstname,lastname,cron,admin) {
  // TODO this currently only works via the UI, after file uploads are set as complete, this is triggered
  // an actuall call to this on the API would trigger emails and deposits for files that had already been processed
  // and also could fail on cluster deployment because only the root machine would actually be able to find the files
  var r = oab_request.findOne({receiver:rid});
  if (!r) {
    return {statusCode: 404, body: {status: 'error', data: '404 not found'}};
  } else if (r.received && admin === undefined) {
    return {statusCode: 400, body: {status: 'error', data: 'Content already received'}};
  } else {
    var today = new Date().getTime();
    r.received = {date:today,from:r.email,description:description,validated:false};
    if (admin) r.received.admin = true;
    if (cron) r.received.cron = true;
    if (content) {
      CLapi.internals.store.receive(rid,content);
    } else if ( url === undefined ) {
      // if neither content or URL we are assuming some other file upload process has populated the folder for this receiver
      // so have a little wait in case the UI is still uploading it - the UI should not wait for response from this endpoint
      Meteor._sleepForMs(5000);
      var fs = Meteor.npmRequire('fs');
      var rdir = Meteor.settings.uploadServer.uploadDir + 'openaccessbutton/' + rid + '/';
      var files = fs.readdirSync(rdir);
      var fl = files[0]; // we only expect one file per submission now
      if (!title) {
        title = r.title ? r.title : fl;
      }

      if (r.type === 'data') {
        var mu = Meteor.settings.openaccessbutton.mail_url;
        // send to the OSF system via the oabutton project email address
        // see http://help.osf.io/m/58281/l/546443-upload-your-research and an example https://osf.io/view/SPSP2016/
        CLapi.internals.sendmail({
          from: r.email,
          to: Meteor.settings.openaccessbutton.osf_address,
          subject: title,
          attachments:[{
            fileName: fl,
            filePath: rdir + fl
          }]
        },mu);
        Meteor._sleepForMs(30000);
        var listing = [];
        try {
          var l = CLapi.internals.tdm.extract({url:"https://osf.io/view/osfm2015/",match:'/\{"nodeurl.*/gi',start:"meetingData",end:"];"});
          var sl = '[' + l.matches[0].result[0] + ']';
          listing = JSON.parse(sl);
        } catch (err) {}
        for ( var li in listing ) {
          if ( title.toLowerCase().replace(/[^a-z0-9]/g,'') === listing[li].title.toLowerCase().replace(/[^a-z0-9]/g,'') ) r.received.osf = 'https://osf.io' + listing[li].nodeUrl;
        }
      } else {
        // submit articles to zenodo
        if (!description) description = "Deposited from Open Access Button";
        var up = {file:rdir+fl,name:fl};
        if (Meteor.settings.openaccessbutton.zenodo_deposit_autopublish) up.publish = true;
        var creators = [{name:''}];
        if (lastname) creators[0].name = lastname;
        if (firstname) creators[0].name += ', ' + firstname;
        if (!firstname && !lastname && r.author) {
          try {
            var author;
            for ( var a in r.author ) {
              if (r.author[a].family && ( author === undefined || r.email.toLowerCase().indexOf(r.author[a].family.toLowerCase()) !== -1 ) ) {
                author = r.author[a].family;
                if (r.author[a].given) author += ', ' + r.author[a].given;
              }
            }
            if (author) creators[0].name = author;
          } catch(err) {}
        }
        var z = CLapi.internals.use.zenodo.deposition.create({title:title,description:description,creators:creators,doi:r.doi},up,Meteor.settings.openaccessbutton.zenodo_token);
        if (z.id) r.received.zenodo = 'https://zenodo.org/record/' + z.id + '/files/' + fl;
      }
    } else {
      // if we are given a URL we just record that fact, and that closes the request
      r.received.url = url;
    }
    
    //var mf = Meteor.settings.openaccessbutton.mail_from;
    // email the person that provided the content, confirming receipt
    // email the person that started the request
    // email everyone who wanted it (requestor and supporters)
    // NOTE the emails to send are different if this content was received via a cron check
    // admin is true, a different email should be sent, as an admin provided the content rather than the author
    if (cron) {} else if (admin) {} else {}
    
    oab_request.update(r._id,{$set:{hold:undefined,received:r.received,status:'received'}});
    return {status: 'success', data: r};
  }
}

CLapi.internals.service.oab.redeposit = function(rid) {
  var r = oab_request.findOne({receiver:rid});
  var today = new Date().getTime();
  var fs = Meteor.npmRequire('fs');
  var rdir = Meteor.settings.uploadServer.uploadDir + 'openaccessbutton/' + rid + '/';
  var files = fs.readdirSync(rdir);
  var fl = files[0];
  var title = r.title ? r.title : fl;
  if (r.type === 'data') {
    var mu = Meteor.settings.openaccessbutton.mail_url;
    CLapi.internals.sendmail({
      from: r.email,
      to: Meteor.settings.openaccessbutton.osf_address,
      subject: title,
      attachments:[{
        fileName: fl,
        filePath: rdir + fl
      }]
    },mu);
    Meteor._sleepForMs(30000);
    var listing = [];
    try {
      var l = CLapi.internals.tdm.extract({url:"https://osf.io/view/osfm2015/",match:'/\{"nodeurl.*/gi',start:"meetingData",end:"];"});
      var sl = '[' + l.matches[0].result[0] + ']';
      listing = JSON.parse(sl);
    } catch (err) {}
    for ( var li in listing ) {
      if ( title.toLowerCase().replace(/[^a-z0-9]/g,'') === listing[li].title.toLowerCase().replace(/[^a-z0-9]/g,'') ) {
        r.received.osf = 'https://osf.io' + listing[li].nodeUrl;
        oab_request.update(r._id,{$set:{'received.osf':r.received.osf}});
      }
    }
  } else {
    var description = r.received.description;
    var up = {file:rdir+fl,name:fl};
    if (Meteor.settings.openaccessbutton.zenodo_deposit_autopublish) up.publish = true;
    var z = CLapi.internals.use.zenodo.deposition.create({title:title,description:description,doi:r.doi},up,Meteor.settings.openaccessbutton.zenodo_token);
    if (z.id) {
      r.received.zenodo = 'https://zenodo.org/record/' + z.id + '/files/' + fl;
      oab_request.update(r._id,{$set:{'received.zenodo':r.received.zenodo}});
    }
  }
  return {status: 'success', data: r};
}

CLapi.internals.service.oab.validate = function(rid,uid) {
  var r = oab_request.findOne(rid);
  if (r) {
    var today = new Date().getTime();
    if (r.received === undefined || r.received === false || r.received.validated === false) {
      return false;
    } else {
      oab_request.update(rid,{$set:{'received.validated':{user:uid,date:today}}});
      return true;
      // TODO should probably trigger some emails here
    }
  } else {
    return false;
  }
}

CLapi.internals.service.oab.template = function(template,refresh) {
  // TODO refresh should be some refresh setting - check how old they were perhaps? or just refresh all
  if (refresh || mail_template.find({service:'openaccessbutton'}).count() === 0) {
    mail_template.remove({service:'openaccessbutton'});
    var ghurl = Meteor.settings.openaccessbutton.templates_url;
    var m = CLapi.internals.tdm.extract({
      url:ghurl,
      matchers:['//OAButton/website/blob/develop/emails/.*?title="(.*?[.].*?)">/gi'],
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
      if (vars.profession.toLowerCase() === 'other') vars.profession = 'user';
      vars.affiliation = u.service.openaccessbutton.profile.affiliation ? u.service.openaccessbutton.profile.affiliation : '';
    }
    vars.userid = vars.user.id;
    vars.fullname = u && u.profile && u.profile.name ? u.profile.name : '';
    vars.username = vars.user.username ? vars.user.username : vars.user.email;
    if (!vars.fullname) vars.fullname = vars.username;
    vars.useremail = vars.user.email
  }
  if (Meteor.settings.dev) content = content.replace(/https:\/\/openaccessbutton.org/g,'https://dev.openaccessbutton.org');
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

CLapi.internals.service.oab.cron = {}
CLapi.internals.service.oab.cron.osf = function() {
  var requests = oab_request.find({status:'received',type:'data','received.osf':{$exists:false}});
  // get the OSF page and extract the json from it
  var listing = [];
  try {
    var l = CLapi.internals.tdm.extract({url:"https://osf.io/view/osfm2015/",match:'/\{"nodeurl.*/gi',start:"meetingData",end:"];"});
    var sl = '[' + l.matches[0].result[0] + ']';
    listing = JSON.parse(sl);
  } catch (err) {}
  var none = true;
  requests.forEach(function(request) {
    if (none) none = false;
    for ( var li in listing ) {
      if ( request.title.toLowerCase().replace(/[^a-z0-9]/g,'') === listing[li].title.toLowerCase().replace(/[^a-z0-9]/g,'') ) {
        console.log('oabutton_osf cron updating URL for ' + request._id + ' to ' + listing[li].nodeUrl);
        oab_request.update(request._id,{$set:{'received.osf':'https://osf.io' + listing[li].nodeUrl}});
      }
    }
  });
  if (none) console.log('oabutton_osf no received OSF requests lacking OSF url - doing nothing.');
}
CLapi.internals.service.oab.cron.availability = function() {
  // look for any request in progress and see how far past progress date it is
  // so need to be able to check when it was set to in progress!
  // send a chase email to the author in question - if not already refused or put on hold or author joined dnr list
  // so call the followup function for each relevant request
  
  // also need to email users who have requests at help status
  // ask them to contribute more info
  
  // there are also various auto email checks that the oabutton team want added. add them here
  
  // check all open requests for any new availability
  var requests = oab_request.find({status:{$ne:'success'}});
  requests.forEach(function(request) {
    Meteor._sleepForMs(500);
    var availability = CLapi.internals.service.oab.availability({url:request.url,type:request.type,nosave:true});
    if (availability.availability.length > 0) {
      for ( var a in availability.availability ) {
        if (availability.availability[a].type === request.type) {
          CLapi.internals.service.oab.receive(
            request.receiver,
            undefined,
            availability.availability[a].url,
            undefined,
            undefined,
            undefined,
            undefined,
            true
          )
        }
      }
    }
  });
}

if ( Meteor.settings.openaccessbutton && Meteor.settings.openaccessbutton.cron ) {
  if (Meteor.settings.openaccessbutton.cron.osf) {
    SyncedCron.add({
      name: 'oabutton_osf',
      schedule: function(parser) { return parser.recur().every(4).minute(); },
      job: CLapi.internals.service.oab.cron.osf
    });
  }
  if (Meteor.settings.openaccessbutton.cron.availability) {
    SyncedCron.add({
      name: 'oabutton_availability',
      schedule: function(parser) { return parser.recur().on(1).dayOfWeek(); },
      job: CLapi.internals.service.oab.cron.availability
    });
  }
}

