
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
  var upd = {}
  upd._id = doc._id + '_' + d;
  upd.createdAt = d;
  upd.created_date = moment(upd.createdAt,"x").format("YYYY-MM-DD HHmm");
  upd.userId = userId;
  upd.doc = doc;
  upd.modifier = JSON.parse(JSON.stringify(modifier.$set));
  for ( var m in upd.modifier ) {
    if (doc[m] === upd.modifier[m] || m === 'updatedAt' || m === 'updated_date') delete upd.modifier[m];
  }
  CLapi.internals.es.insert('/oab/history/' + upd._id, upd);
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
      var opts = this.queryParams;
      var ident = this.queryParams.doi;
      if ( this.queryParams.url ) ident = this.queryParams.url;
      if ( this.queryParams.pmid ) ident = 'pmid' + this.queryParams.pmid;
      if ( this.queryParams.pmc ) ident = 'pmc' + this.queryParams.pmc.toLowerCase().replace('pmc','');
      if ( this.queryParams.title ) ident = 'TITLE:' + this.queryParams.title;
      if ( this.queryParams.citation ) ident = 'CITATION:' + this.queryParams.citation;
      opts.url = ident;
      // should maybe put auth on the ability to pass in library and libraries...
      if (opts.libraries) opts.libraries = opts.libraries.split(',');
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
      var opts = this.request.body;
      var ident = this.request.body.doi;
      if (this.queryParams.from && !this.request.body.from) this.request.body.from = this.queryParams.from;
      if (this.queryParams.plugin && !this.request.body.plugin) this.request.body.plugin = this.queryParams.plugin;
      if ( this.request.body.url ) ident = this.request.body.url;
      if ( this.request.body.pmid ) ident = 'pmid' + this.request.body.pmid;
      if ( this.request.body.pmc ) ident = 'pmc' + this.request.body.pmc.toLowerCase().replace('pmc','');
      if ( this.request.body.title ) ident = 'TITLE:' + this.request.body.title;
      if ( this.request.body.citation ) ident = 'CITATION:' + this.request.body.citation;
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
      return CLapi.internals.service.oab.request(req,uid,this.queryParams.fast);
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
        if (r.user === undefined && !r.story && this.request.body.story ) r = CLapi.internals.service.oab.own(r._id,this.userId);
        // depending on whether user, creator, or admin, affects what things can be updated
        var n = {};
        if (CLapi.internals.accounts.auth('openaccessbutton.admin',this.user)) {
          if (this.request.body.test !== undefined && this.request.body.test !== r.test) n.test = this.request.body.test;
          if (this.request.body.status !== undefined && this.request.body.status !== r.status) n.status = this.request.body.status;
          if (this.request.body.rating !== undefined && this.request.body.rating !== r.rating) n.rating = this.request.body.rating;
          if (this.request.body.name !== undefined && this.request.body.name !== r.name) n.name = this.request.body.name;
          if (this.request.body.email !== undefined && this.request.body.email !== r.email) n.email = this.request.body.email;
          if (this.request.body.story !== undefined && this.request.body.story !== r.story) n.story = this.request.body.story;
          if (this.request.body.journal !== undefined && this.request.body.journal !== r.journal) n.journal = this.request.body.journal;
          if (this.request.body.notes !== undefined && this.request.body.notes !== r.notes) n.notes = this.request.body.notes;
        }
        if (this.request.body.email !== undefined && this.request.body.email !== r.email && ( CLapi.internals.accounts.auth('openaccessbutton.admin',this.user) || r.status === undefined || r.status === 'help' || r.status === 'moderate' || r.status === 'refused' ) ) n.email = this.request.body.email;
        if (r.user && this.userId === r.user.id && this.request.body.story !== undefined && this.request.body.story !== r.story) n.story = this.request.body.story;
        if (this.request.body.url !== undefined && this.request.body.url !== r.url) n.url = this.request.body.url;
        if (this.request.body.title !== undefined && this.request.body.title !== r.title) n.title = this.request.body.title;
        if (this.request.body.doi !== undefined && this.request.body.doi !== r.doi) n.doi = this.request.body.doi;
        if (n.status === undefined) {
          if ( (!r.title && !n.title) || (!r.email && !n.email) || (!r.story && !n.story) ) {
            n.status = 'help';
          } else if (r.status === 'help' && ( (r.title || n.title) && (r.email || n.email) && (r.story || n.story) ) ) {
            n.status = 'moderate';
          }
        }
        if (JSON.stringify(n) !== '{}') oab_request.update(r._id,{$set:n});
        if (n.story && !r.story) {
          var text = (Meteor.settings.dev ? 'https://dev.openaccessbutton.org/request/' : 'https://openaccessbutton.org/request/') + r._id + '\n\n';
          text += JSON.stringify(r,null,' ');
          CLapi.internals.mail.send({
            from: 'requests@openaccessbutton.org',
            to: ['natalianorori@gmail.com'],
            subject: 'Request updated with story ' + r._id,
            text: text
          },Meteor.settings.openaccessbutton.mail_url);
        }
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

CLapi.addRoute('service/oab/request/:rid/admin/:action', {
  get: {
    roleRequired:'openaccessbutton.admin',
    action: function() {
      CLapi.internals.service.oab.admin(this.urlParams.rid,this.urlParams.action);
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

CLapi.addRoute('service/oab/history/:rid', {
  get: {
    action: function() {
      var res = CLapi.internals.es.query('GET','/oab/history/_search?size=10000&sort=createdAt:desc&q=doc._id:'+this.urlParams.rid).hits.hits;
      var ret = [];
      for (var r in res) ret.push(res[r]._source);
      return ret;
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
      return {status:'success',data:CLapi.internals.service.oab.blacklist(undefined,undefined,this.queryParams.stale)};
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
        return CLapi.internals.service.oab.receive(this.urlParams.rid,this.bodyParams.content,this.bodyParams.url,this.bodyParams.title,this.bodyParams.description,this.bodyParams.firstname,this.bodyParams.lastname,undefined,admin,this.bodyParams.notfromauthor);
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
        if (r.user && r.user.email === this.queryParams.email) d.dnr = 'creator';
        if (!d.dnr) {
          var supports = oab_support.find({rid:this.queryParams.request}).fetch();
          for ( var s in supports ) {
            if (supports[s].email === this.queryParams.email) d.dnr = 'supporter';
          }
        }
      }
      if (!d.dnr && this.queryParams.validate) {
        // check if this is a valid email address - create and call an internals mail function that calls to mailgun email validator
        d.validation = CLapi.internals.mail.validate(this.queryParams.email,Meteor.settings.openaccessbutton.mail_public_apikey);
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
      // if this.request.body.form = bug or wrong should also create on github
      // if it is noshare, should save info into the related request and email requests@openaccessbutton.org (need the request ID in a url param somewhere)
      var text = 'Openaccessbutton site feedback:\n\n';
      try {
        for ( var r in this.request.body) {
          if (r !== 'navigator') {
            text += r + ': ' + JSON.stringify(this.request.body[r],undefined,2) + '\n\n';
          }
        }
        if (this.request.body.navigator) text += JSON.stringify(this.request.body.navigator,undefined,2);
      } catch(err) {
        text = JSON.stringify(this.reqeust.body,undefined,2);
      }
      CLapi.internals.mail.send({
        from: 'feedbackform@openaccessbutton.org',
        to: ['help@openaccessbutton.org'],
        subject: 'Feedback form submission',
        text: text
      },Meteor.settings.openaccessbutton.mail_url);
      
      return {
        statusCode: 302,
        headers: {
          'Content-Type': 'text/plain',
          'Location': 'https://openaccessbutton.org/bug#defaultthanks'
        },
        body: 'Location: ' + 'https://openaccessbutton.org/bug#defaultthanks'
      };
    }    
  }
});

CLapi.addRoute('service/oab/import', {
  post: {
    roleRequired: 'openaccessbutton.admin', // later could be opened to other oab users, with some sort of quota / limit
    action: function() {
      try {
        var records = this.request.body;
        var resp = {found:0,updated:0,missing:[]};
        for ( var p in this.request.body ) {
          if (this.request.body[p]._id  ) {
            var rq = oab_request.findOne(this.request.body[p]._id);
            if (rq) {
              resp.found += 1;
              var update = {};
              for ( var up in this.request.body[p] ) {
                if (this.request.body[p][up] === 'DELETE') this.request.body[p][up] = undefined;
                if ( ( this.request.body[p][up] === undefined || this.request.body[p][up]) && ['createdAt','created_date'].indexOf(up) === -1 ) {
                  if (up.indexOf('refused.') === 0 && ( rq.refused === undefined || rq.refused[up.split('.')[1]] !== this.request.body[p][up] ) ) {
                    if (update.refused === undefined) update.refused = {};
                    update.refused[up.split('.')[1]] = this.request.body[p][up];
                  } else if (up.indexOf('received.') === 0 && ( rq.received === undefined || rq.received[up.split('.')[1]] !== this.request.body[p][up] ) ) {
                    if (update.received === undefined) update.received = {};
                    update.received[up.split('.')[1]] = this.request.body[p][up];
                  } else if (up === 'sherpa.color' && ( rq.sherpa === undefined || rq.sherpa.color !== this.request.body[p][up] ) ) {
                    update.sherpa = {color:this.request.body[p][up]};
                  } else if (rq[up] !== this.request.body[p][up]) {
                    update[up] = this.request.body[p][up];
                  }
                }
              }
              if (JSON.stringify(update) !== '{}') {
                oab_request.update(rq._id,{$set:update});
                resp.updated += 1;
              }
            } else {
              resp.missing.push(this.request.body[p]._id);
            }
          }
        }
        return {status:'success',data:resp};
      } catch(err) {
        return {status:'error'}
      }
    }
  }
});

CLapi.addRoute('service/oab/export/:what', {
  get: {
    //roleRequired: 'openaccessbutton.admin',
    action: function() {
      var results = [];
      if (this.urlParams.what === 'dnr') {
        var match = {};
        if (this.queryParams.from || this.queryParams.to) match.createdAt = {};
        if (this.queryParams.from) match.createdAt.$gt = this.queryParams.from;
        if (this.queryParams.to) match.createdAt.$lt = this.queryParams.to;
        results = oab_dnr.find(match).fetch();
      } else {
        var rt = this.urlParams.what === 'mail' ? '/clapi/mail/_search?q=domain.exact:mg.openaccessbutton.org' : '/oab/history/_search?q=*';
        if (this.queryParams.from || this.queryParams.to) {
          rt += ' AND createdAt:[' + (this.queryParams.from ? this.queryParams.from : '*') + ' TO ' + (this.queryParams.to ? this.queryParams.to : '*') + ']'
        }
        rt += '&sort=createdAt:asc&size=100000';
        var ret = CLapi.internals.es.query('GET',rt);
        var fields = this.urlParams.what === 'changes' ? ['_id','createdAt','created_date'] : [];
        for ( var r in ret.hits.hits ) {
          if (this.urlParams.what === 'mail') {
            for ( var f in ret.hits.hits[r]._source) {
              if (fields.indexOf(f) === -1) fields.push(f);
            }
            results.push(ret.hits.hits[r]._source);
          } else {
            var m = {
              _id: ret.hits.hits[r]._source._id.split('_')[0],
              createdAt: ret.hits.hits[r]._source.createdAt,
              created_date: ret.hits.hits[r]._source.created_date
            }
            for ( var mr in ret.hits.hits[r]._source.modifier ) {
              if (mr !== '$set') {
                if (fields.indexOf(mr) === -1) fields.push(mr);
                m[mr] = ret.hits.hits[r]._source.modifier[mr];
              }
            }
            results.push(m);
          }
        }
      }
      var csv = CLapi.internals.convert.json2csv({fields:fields},undefined,results);

      var name = 'export_' + this.urlParams.what;
      this.response.writeHead(200, {
        'Content-disposition': "attachment; filename="+name+".csv",
        'Content-type': 'text/csv; charset=UTF-8',
        'Content-Encoding': 'UTF-8'
      });
      this.response.end(csv);
      // NOTE: this should really return to stop restivus throwing an error, and should really include
      // the file length in the above head call, but this causes an intermittent write afer end error
      // which crashes the whole system. So pick the lesser of two fuck ups.
    }
  }
});

CLapi.addRoute('service/oab/job', {
  get: {
    action: function() {
      // get all job info
      var jobs = job_job.find({service:'openaccessbutton'}).fetch();
      for ( var j in jobs ) {
        //jobs[j].progress = CLapi.internals.job.progress(jobs[j]._id).progress;
        jobs[j].processes = jobs[j].processes.length;
      }
      jobs.sort(function(a,b) { return b.createdAt - a.createdAt; });
      return jobs;
    }
  },
  post: {
    roleRequired: 'openaccessbutton.user', // later could be opened to other oab users, with some sort of quota / limit
    action: function() {
      var processes = this.request.body.processes ? this.request.body.processes : this.request.body;
      for ( var p in processes ) {
        processes[p].plugin = this.request.body.plugin ? this.request.body.plugin : 'bulk';
        if (this.request.body.libraries) processes[p].libraries = this.request.body.libraries;
      }
      var jid = CLapi.internals.job.create({notify:'CLapi.internals.service.oab.sendbulkcompletionconfirmation',user:this.userId,service:'openaccessbutton',function:'CLapi.internals.service.oab.availability',name:(this.request.body.name ? this.request.body.name : "oab_availability"),processes:processes},this.userId);
      return jid;
    }
  }
});
CLapi.addRoute('service/oab/job/generate/:start/:end', {
  post: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      var start = moment(this.urlParams.start, "DDMMYYYY").valueOf();
      var end = moment(this.urlParams.end, "DDMMYYYY").endOf('day').valueOf();
      var processes = oab_request.find({status:{$not:{$eq:'received'}},createdAt:{$gte:start,$lt:end}}).fetch();
      if (processes.length) {
        var procs = [];
        for ( var p in processes ) procs.push({url:processes[p].url});
        var name = 'sys_requests_' + this.urlParams.start + '_' + this.urlParams.end;
        var jid = CLapi.internals.job.create({notify:'CLapi.internals.service.oab.sendbulkcompletionconfirmation',user:this.userId,service:'openaccessbutton',function:'CLapi.internals.service.oab.availability',name:name,processes:procs},this.userId);
        return {job:jid,count:processes.length};
      } else {
        return {count:0}
      }
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/progress', {
  get: {
    action: function() {
      return CLapi.internals.job.progress(this.urlParams.jid);
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/remove', {
  get: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      return CLapi.internals.job.remove(this.urlParams.jid);
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/request', {
  get: {
    roleRequired: 'openaccessbutton.admin',
    action: function() {
      var results = CLapi.internals.job.results(this.urlParams.jid);
      var identifiers = [];
      for ( var r in results ) {
        if (results[r].result.availability.length === 0 && results[r].result.requests.length === 0) {
          var rq = {};
          if (results[r].result.match) {
            if (results[r].result.match.indexOf('TITLE:') === 0) {
              rq.title = results[r].result.match.replace('TITLE:','');
            } else if (results[r].result.match.indexOf('CITATION:') !== 0) {
              rq.url = results[r].result.match;
            }
          }
          if (results[r].result.meta && results[r].result.meta.article) {
            if (results[r].result.meta.article.doi) {
              rq.doi = results[r].result.meta.article.doi;
              if (!rq.url) rq.url = 'https://doi.org/' + results[r].result.meta.article.doi;
            }
            if (results[r].result.meta.article.title && !rq.title) rq.title = results[r].result.meta.article.title;
          }
          if (rq.url) {
            var created = CLapi.internals.service.oab.request(rq,this.userId);
            if (created) identifiers.push(created);
          }
        }
      }
      return identifiers;
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/results', {
  get: {
    action: function() {
      return CLapi.internals.job.results(this.urlParams.jid);
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/results.json', {
  get: {
    action: function() {
      return CLapi.internals.job.results(this.urlParams.jid);
    }
  }
});
CLapi.addRoute('service/oab/job/:jid/results.csv', {
  get: {
    action: function() {
      var res = CLapi.internals.job.results(this.urlParams.jid);
      var csv = '';
      var inputs = [];
      for ( var ro in res ) { // TODO need a proper way to store original input fields in job, then output them again here
        for ( var a in res[ro].args ) {
          if ( ['plugin','libraries','refresh','url','library','discovered','source'].indexOf(a) === -1 && inputs.indexOf(a) === -1 ) {
            inputs.push(a);
            if (csv !== '') csv += ',';
            csv += '"' + a + '"';
          }
        }
      }
      if (csv !== '') csv += ',';
      csv += '"MATCH","AVAILABLE","SOURCE","REQUEST","TITLE","DOI"';
      var liborder = [];
      if (res[0].args.libraries !== undefined) {
        for ( var l in res[0].args.libraries ) {
          liborder.push(res[0].args.libraries[l]);
          csv += ',"' + res[0].args.libraries[l].toUpperCase() + '"';
        }
      }
      for ( var r in res ) {
        var row = res[r].result;
        csv += '\n"';
        for ( var i in inputs ) {
          if (res[r].args[inputs[i]] !== undefined) csv += res[r].args[inputs[i]];
          csv += '","';
        }
        csv += row.match ? row.match.replace('TITLE:','').replace(/"/g,'') + '","' : '","';
        var av = 'No';
        for ( var a in row.availability ) {
          if (row.availability[a].type === 'article') av = row.availability[a].url.replace(/"/g,'');
        }
        csv += av + '","';
        if (av !== 'No' && row.meta && row.meta.article && row.meta.article.source) csv += row.meta.article.source;
        csv += '","';
        var rq = '';
        for ( var re in row.requests ) {
          if (row.requests[re].type === 'article') rq = 'https://' + (Meteor.settings.dev ? 'dev.' : '') + 'openaccessbutton.org/request/' + row.requests[re]._id;
        }
        csv += rq + '","';
        if (row.meta && row.meta.article && row.meta.article.title) csv += row.meta.article.title.replace(/"/g,'').replace(/[^\x00-\x7F]/g, "");
        csv += '","';
        if (row.meta && row.meta.article && row.meta.article.doi) csv += row.meta.article.doi;
        csv += '"';
        if (row.libraries) {
          for ( var lb in liborder ) {
            var lib = row.libraries[liborder[lb]];
            csv += ',"';
            var js = false;
            if ( lib && lib.journal && lib.journal.library ) {
              js = true;
              csv += 'Journal subscribed';
            }
            var rp = false;
            if ( lib && lib.repository ) {
              rp = true;
              if (js) csv += '; '
              csv += 'In repository';
            }
            var ll = false;
            if ( lib && lib.local && lib.local.length ) {
              ll = true;
              if (js || rp) csv += '; ';
              csv += 'In library';
            }
            if (!js && !rp && !ll) csv += 'Not available';
            csv += '"';
          }
        }
      }
      var job = job_job.findOne(this.urlParams.jid);
      var name = 'results';
      if (job.name) name = job.name.split('.')[0].replace(/ /g,'_') + '_results';
      console.log('writing csv');
      this.response.writeHead(200, {
        'Content-disposition': "attachment; filename="+name+".csv",
        'Content-type': 'text/csv; charset=UTF-8',
        'Content-Encoding': 'UTF-8'
      });
      this.response.end(csv);
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
    requested: oab_request.aggregate( [ { $group: { _id: "$user"} } ] ).length
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
    } else {
      oab_request.find({email:email}).forEach(function(r) {
        if (['help','moderate','progress'].indexOf(r.status) !== -1) {
          oab_request.update(r._id,{$set:{email:'',status:'help'}});
        }
      });
    }
  }
  return ondnr !== undefined || add === true;
}

CLapi.internals.service.oab.blacklist = function(url,fulltextable,stale) {
  if (stale === false) stale = 0;
  if (stale === undefined) stale = 60000;
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

CLapi.internals.service.oab.sanitise = function(url,stale) {
  if (stale === false) stale = 0;
  if (stale === undefined) stale = 60000;
  if (url !== undefined && (url.length < 4 || url.indexOf('.') === -1) ) return false;
  var rl = CLapi.internals.use.google.sheets.feed(Meteor.settings.openaccessbutton.repositories_sheetid,stale);
  var rlist = [];
  for ( var l in rl ) rlist.push(rl[l].domain);
  if (url) {
/*
Process for filtering crap URLs (SEPARATE IT FROM BLACKLIST AND CALL IT SANITISE):
* we find a URL from our academic resolve, given to us by third party systems
* for any sources that we cannot trust, do the following extra checks (e.g. may not do for oadoi to keep speed up, IF we trust their results enough)
* resolve the URL to whatever it redirects to, if it redirects (e.g resolve DOI URLs, and any other URLs)
* if content-type is not html let's assume it is the actual thing we want and not a login redirect / js login page
* load our repositories sheet (check against DOMAIN as fragment, but don't worry about http/https difference)
* check if the URL has an exact match for one with a REDIRECT - if so, switch the URL and return it e.g where someone gives us a one off link that they also give us a good link for
* check if the URL has a submatch for one with ONLY BLACKLIST "yes" - if so, stop processing and do not return the URL e.g researchgate or a one off link that we don't have a good link for.
* check if the URL contains any LOGINWALL fragment (comma separated list), if so stop processing and do not return the URL

* If still going, and FULLTEXT is present, check if URL matches the FULLTEXT wildcard format, and if so assume it is already a fulltext URL
* if it is not already a FULLTEXT format, then convert it to the fulltext format
* if FULLTEXT not available or not successful, check if there is an ELEMENT - if so get the page and retrieve the URL in that element (slow, depends on load times)
* for checking ELEMENT, strip newlines and unnecessary whitespaces from content and from ELEMENT, and lowercase, and check if is relative or absolute URL
* if a new URL could not be generated from ELEMENT or from FULLTEXT, and if BLACKLIST is "yes", stop processing and do not return the URL

* if still going, for whatever URL we now have, resolve it to see if it redirects (this will catch login pages and other issues)
* and for whatever the URL is now, check against the LOGINWALL parameter again - if it contains it, stop and do not return the URL

* If we get to here, DO return the URL
*/
    return false;
  } else {
    return rlist;
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
  createdAt: "date request was created js unix timestamp",
  created_date: "date request created, human readable",
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
    description: "description of provided content, if available",
    url: "url to where it is (remote if provided, or on our system if uploaded)"
    admin: "true if submitted by an admin",
    cron: "true if found from weekly check",
    notfromauthor: "true if submitted by admin and the admin did not get it from the author"
  }
}
*/
CLapi.internals.service.oab.request = function(req,uid,fast) {
  // this can contain user-side data so fail silently if anything wrong
  console.log('oabutton creating new request');
  var dom;
  if (req.dom) {
    dom = req.dom;
    console.log('dom of length ' + req.dom.length + ' was provided, but removed before saving');
    delete req.dom;
  }
  if (req.url && req.url.indexOf('//') === -1) req.url = req.url.replace(/\+/g,' ');
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
  if (req.user === undefined && user && req.story) {
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
  req.count = req.story ? 1 : 0;
  
  if (!fast && (!req.title || !req.email) ) { // worth scraping on any other circumstance?
    var meta = CLapi.internals.service.oab.scrape(req.url,dom,undefined,req.doi);
    req.keywords = meta && meta.keywords ? meta.keywords : [];
    req.title = meta && meta.title ? meta.title : "";
    req.doi = meta && meta.doi ? meta.doi : "";

    req.email = meta && meta.email ? meta.email : "";
    
    // some optional extras that the extract can return
    req.author = meta && meta.author ? meta.author : [];
    req.journal = meta && meta.journal ? meta.journal : "";
    req.issn = meta && meta.issn ? meta.issn : "";
    req.publisher = meta && meta.publisher ? meta.publisher : "";
    
    if (req.journal) {
      try {
        var sherpa = CLapi.internals.use.sherpa.romeo.search({jtitle:req.journal});
        req.sherpa = {color:sherpa.data.publishers[0].publisher[0].romeocolour[0]}
      } catch(err) {}
    }
  }

  req.status = !req.story || !req.title || !req.email || req.user === undefined ? "help" : "moderate";
  
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
  var text = (Meteor.settings.dev ? 'https://dev.openaccessbutton.org/request/' : 'https://openaccessbutton.org/request/') + req._id + '\n\n';
  text += JSON.stringify(req,null,' ');
  if (req.story) {
    CLapi.internals.mail.send({
      from: 'requests@openaccessbutton.org',
      to: ['natalianorori@gmail.com'],
      subject: 'New request created ' + req._id,
      text: text
    },Meteor.settings.openaccessbutton.mail_url);
  }
  return req;
}

CLapi.internals.service.oab.admin = function(rid,action) {
  var r = oab_request.findOne(rid);
  var vars = CLapi.internals.service.oab.vars(r);
  var usermail;
  if (r.user && r.user.id) {
    var u = CLapi.internals.accounts.retrieve(r.user.id);
    usermail = u.emails[0].address;
  }
  var update = {};
  var requestors = [];
  if (usermail) requestors.push(usermail);
  oab_support.find({rid:rid}).forEach(function(s) {
    if (s.email && requestors.indexOf(s.email) === -1) requestors.push(s.email);
  });
  if (action === 'received_thank_and_notify' && r.type === 'article') {
    if (r.status !== 'received') update.status = 'received';
    if (r.email) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'authors_thanks_article.html'},to:r.email});
    if (requestors.length) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'requesters_request_success_article.html'},to:requestors});
  } else if (action === 'send_to_author') {
    update.status = 'progress';
    if (r.story) update.rating = 1;
    if (requestors.length) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'requesters_request_inprogress.html'},to:requestors});
    if (r.type === 'article') {
      if (r.story) {
        if (r.email) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'author_request_article_v2.html'},to:r.email});
      } else {
        if (r.email) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'author_request_article_v2_nostory.html'},to:r.email});
      }
    } else {
      if (r.email) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'author_request_data_v2.html'},to:r.email});      
    }
  } else if (action === 'story_too_bad') {
    update.rating = 0;
    if (requestors.length) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'requesters_request_inprogress.html'},to:requestors});
    if (r.email) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'author_request_article_v2_nostory.html'},to:r.email});      
  } else if (action === 'not_a_scholarly_article') {
    update.status = 'closed';
    if (usermail) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'initiator_invalid.html'},to:usermail});
  } else if (action === 'dead_author') {
    update.status = 'closed';
    if (requestors.length) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'requesters_request_failed_authordeath.html'},to:requestors});
  } else if (action === 'user_testing') {
    update.test = true;
    update.status = 'closed';
    if (r.story) update.rating = 0;
    if (usermail) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'initiator_testing.html'},to:usermail});
  } else if (action === 'broken_link') {
    if (usermail) CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'initiator_brokenlink.html'},to:usermail});
  } else if (action === 'remove_submitted_url') {
    update.status = 'moderate';
    update.received = false;
  }
  if (JSON.stringify(update) !== '{}') oab_request.update(rid,{$set:update});
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
      if (req.count === undefined || req.count === 0) req.count = 1;
      oab_request.update(rid,{$set:{user:req.user,count:req.count}});
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
      if ( ( email === undefined || isauthor ) && !CLapi.internals.service.oab.dnr(s.email[e]) && CLapi.internals.mail.validate(s.email[e],Meteor.settings.openaccessbutton.mail_public_apikey).is_valid ) email = s.email[e];
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
    },Meteor.settings.openaccessbutton.mail_url);
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

CLapi.internals.service.oab.library = function(opts) {
  var library = {institution:opts.library,primo:{}};
  var meta = {};
  if (opts.url.indexOf('TITLE:') === 0 || opts.url.indexOf('CITATION:') === 0) {
    var check = CLapi.internals.use.crossref.reverse(opts.url.replace('CITATION:',''));
    if (check.data && check.data.doi) {
      meta = CLapi.internals.academic.catalogue.extract('https://doi.org/' + check.data.doi);
    } else if (opts.url.indexOf('TITLE:') === 0) {
      meta.title = opts.url.replace('TITLE:','');
    }
  } else {
    meta = CLapi.internals.academic.catalogue.extract(opts.url,opts.dom);
  }
  if (meta.title) {
    library.title = meta.title;
    var tqr = 'title,exact,'+meta.title.replace(/ /g,'+');
    var lib = CLapi.internals.use.exlibris.primo(tqr,undefined,undefined,opts.library);
    if (lib.data && lib.data.length > 0) {
      library.primo.title = {query:tqr,result:lib.data};
      library.local = [];
      for ( var l in lib.data ) {
        if (lib.data[l].library && lib.data[l].type !== 'video') {
          library.local.push(lib.data[l]);
        }
        if ( lib.data[l].repository && lib.data[l].type !== 'video' && library.repository === undefined ) {
          library.repository = lib.data[l];
        }
      }
    }
  }
  if ( meta.journal ) {
    // exlibris may only tell us they have access to the journal, not every article. So if not found 
    // do a check for journal availability
    library.journal = {title:meta.journal};
    var jqr = 'rtype,exact,journal&query=swstitle,begins_with,'+meta.journal.replace(/ /g,'+')+'&sortField=stitle';
    var jrnls = CLapi.internals.use.exlibris.primo(jqr,undefined,50,opts.library);
    if (jrnls.data && jrnls.data.length > 0) {
      library.primo.journal = {query:jqr,result:jrnls.data};
      for ( var j in jrnls.data ) {
        var jrnl = jrnls.data[j];
        var inj = library.journal.title.split(' [')[0].toLowerCase().replace(/[^a-z]/g,''); //York results had [Electronic resource] in the titles, so split there
        var rnj = jrnl.title.split(' [')[0].toLowerCase().replace(/[^a-z]/g,'');
        if (rnj.indexOf(inj) === 0 && rnj.length < inj.length+3) {// && jrnl.library) {
          if (jrnl.library) {
            library.journal = jrnl;
          } else {
            library.journal.library = true;
          }
          break;
        }
      }
    }
  }
  return library;
}
CLapi.internals.service.oab.libraries = function(opts) {
  var libs = {};
  for ( var l in opts.libraries ) {
    opts.library = opts.libraries[l];
    libs[opts.libraries[l]] = CLapi.internals.service.oab.library(opts);
  }
  return libs;
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
  if (opts.refresh === undefined) opts.refresh = 7;
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
    if (opts.doi) bu = 'https://doi.org/' + (opts.doi.indexOf('doi.org/') !== -1 ? opts.doi.split('doi.org/')[1] : opts.doi);
    if (bu) opts.url = bu;
  }
  if (opts.url === undefined) return {} // opts.url could actually be doi, pmid, pmc, title, citation - what to do about how we store each?
  if (opts.url && opts.url.indexOf('//') === -1) opts.url = opts.url.replace(/\+/g,' ');
  
  var ret = {match:opts.url,availability:[],requests:[],accepts:[],meta:{article:{},data:{}}};
  var already = [];
  
  console.log('OAB availability checking for sources');

  if (opts.library) ret.library = CLapi.internals.service.oab.library(opts);
  if (opts.libraries) ret.libraries = CLapi.internals.service.oab.libraries(opts);

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
    var url, checked;
    if (opts.url && opts.refresh !== 0) {
      var fnd = {$and:[{'url':opts.url}]};
      var d = new Date();
      var t = d.setDate(d.getDate() - opts.refresh);
      fnd.$and.push({createdAt:{$gte:t}});
      var checked = oab_availability.findOne(fnd,{sort:{createdAt:-1}});
      fnd.$and.pop();
      fnd.$and.push({'discovered':{$exists:true}});
      fnd.$and.push({'discovered.article':{$ne:false}});
      var avail = oab_availability.findOne(fnd,{sort:{createdAt:-1}});
      if (avail && !CLapi.internals.service.oab.blacklist(avail.discovered.article)) {
        console.log('found in previous availabilities ' + opts.url + ' ' + avail.url + ' ' + avail.discovered.article);
        url = avail.discovered.article;
        if (avail.source && avail.source.article) ret.meta.article.source = avail.source.article;
      }
    }
    if (checked) {
      // we have previously checked within the refresh time but not found it, don't check again
      // if there was anything else useful we could do, add it here
    } else {
      if (url === undefined) {
        var res = CLapi.internals.academic.resolve(opts.url,opts.dom); // opts.url could actually be a pmid, pmc, or doi - this checks oabutton for received requests too
        ret.meta.article.doi = res.doi;
        if (ret.meta.article.doi && ret.match.indexOf('http') !== 0 ) ret.match = 'https://doi.org/' + ret.meta.article.doi;
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
  }
  // TODO add availability checkers for any new types that are added to the accepts list  

  //console.log('OAB availability checking for requests');
  if (opts.url.indexOf('http') !== 0 && ret.meta.article && ret.meta.article.doi) opts.url = 'https://doi.org/' + ret.meta.article.doi;
  if (!opts.type || already.indexOf(opts.type) === -1) {
    var matcher = {url:opts.url};
    if (opts.type) matcher.type = opts.type;
    var requests = oab_request.find(matcher).fetch();
    //console.log('found ' + requests.length + ' existing requests');
    for ( var r in requests ) {
      if ( already.indexOf(requests[r].type) === -1 ) {
        if ( requests[r].received !== undefined ) {
          ret.availability.push({type:requests[r].type,url:(Meteor.settings.dev ? 'https://dev.openaccessbutton.org' : 'https://openaccessbutton.org') + '/request/' + requests[r]._id});
          already.push(requests[r].type);
          opts.discovered[requests[r].type] = url;
          opts.source[requests[r].type] = 'oabutton';
        } else {
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
  var requestors = [];
  oab_support.find({rid:rid}).forEach(function(s) {
    if (s.email && requestors.indexOf(s.email) === -1) requestors.push(s.email);
  });
  if (requestors.length) {
    var vars = CLapi.internals.service.oab.vars(r);
    CLapi.internals.service.oab.sendmail({vars:vars,template:{filename:'requesters_request_refused.html'},to:requestors});
  }
  var text = (Meteor.settings.dev ? 'https://dev.openaccessbutton.org/request/' : 'https://openaccessbutton.org/request/') + r._id + '\n\n';
  text += JSON.stringify(r,null,' ');
  CLapi.internals.mail.send({
    from: 'requests@openaccessbutton.org',
    to: ['natalianorori@gmail.com'],
    subject: 'Request ' + r._id + ' refused',
    text: text
  },Meteor.settings.openaccessbutton.mail_url);
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

CLapi.internals.service.oab.receive = function(rid,content,url,title,description,firstname,lastname,cron,admin,notfromauthor) {
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
    if (notfromauthor) r.received.notfromauthor = true;
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
        // linking direct to the zenodo file did not appear to work in live publications, so revert to just linking to the record
        // see https://zenodo.org/record/546117 for example
        if (z.id) r.received.zenodo = 'https://zenodo.org/record/' + z.id;// + '/files/' + fl;
      }
    } else {
      // if we are given a URL we just record that fact, and that closes the request
      r.received.url = url;
    }
    
    var whoto = [];
    var tmplfn;
    if (r.user) {
      if (r.user.email) {
        whoto.push(r.user.email);
      } else if (r.user.id) {
        var u = CLapi.internals.accounts.retrieve(r.user.id);
        whoto.push(u.emails[0].address);
      }
    }
    if (cron || admin) {
      tmplfn = 'searcher_successviafind.html';
    } else {
      // email request creator and supporters saying it is available - why does this template need to differ from the above?
      // email the author to say thanks for providing?
    }
    // need to provide articleurl var to this template too
    //if (tmplfn) CLapi.internals.service.oab.sendmail({template:{filename:tmplfn},bcc:whoto});
    
    oab_request.update(r._id,{$set:{hold:undefined,received:r.received,status:'received'}});
    var text = (Meteor.settings.dev ? 'https://dev.openaccessbutton.org/request/' : 'https://openaccessbutton.org/request/') + r._id + '\n\n';
    text += JSON.stringify(r,null,' ');
    CLapi.internals.mail.send({
      from: 'requests@openaccessbutton.org',
      to: ['natalianorori@gmail.com'],
      subject: 'Request ' + r._id + ' received',
      text: text
    },Meteor.settings.openaccessbutton.mail_url);
    if (Meteor.settings.openaccessbutton.notifications.receive) CLapi.internals.service.oab.admin(r._id,'received_thank_and_notify');

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

CLapi.internals.service.oab.vars = function(vars) {
  if (vars && vars.user) {
    var u = CLapi.internals.accounts.retrieve(vars.user.id);
    if (u) {
      vars.profession = u.service.openaccessbutton.profile.profession ? u.service.openaccessbutton.profile.profession : 'person';
      if (vars.profession.toLowerCase() === 'other') vars.profession = 'person';
      vars.affiliation = u.service.openaccessbutton.profile.affiliation ? u.service.openaccessbutton.profile.affiliation : '';
    }
    vars.userid = vars.user.id;
    vars.fullname = u && u.profile && u.profile.name ? u.profile.name : '';
    if (!vars.fullname && u && u.profile && u.profile.firstname) {
      vars.fullname = u.profile.firstname;
      if (u.profile.lastname) vars.fullname += ' ' + u.profile.lastname;
    }
    if (!vars.fullname) vars.fullname = 'a user';
    vars.username = vars.user.username ? vars.user.username : vars.fullname;
    vars.useremail = vars.user.email
  }
  if (!vars.profession) vars.profession = 'person';
  if (!vars.fullname) vars.fullname = 'a user';
  if (!vars.name) vars.name = 'colleague';
  return vars;
}

CLapi.internals.service.oab.substitute = function(content,vars,markdown) {
  vars = CLapi.internals.service.oab.vars(vars);
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
  
  return CLapi.internals.mail.send(opts,Meteor.settings.openaccessbutton.mail_url);
}

CLapi.internals.service.oab.sendbulkcompletionconfirmation = function(opts) {
  console.log('OAB sending bulk completion email');
  if (!opts.job.email && opts.job.user) {
    var usr = CLapi.internals.accounts.retrieve(opts.job.user);
    opts.job.email = usr.emails[0].address;
  }
  CLapi.internals.mail.send({
    template: 'bulk_complete.html',
    from: Meteor.settings.openaccessbutton.mail_from,
    to: opts.job.email,
    vars: {
      _id:opts.job._id,
      useremail:opts.job.email,
      jobname: opts.job.name
    }
  },Meteor.settings.openaccessbutton.mail_url);
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
  var requests = oab_request.find({status:{$not:{$eq:'received'}}});
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
      schedule: function(parser) { return parser.recur().every(10).minute(); },
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

