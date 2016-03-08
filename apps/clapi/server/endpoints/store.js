
// store API - to store files and provide controlled access to them
// TODO should this be able to store information about certain files and their permissions?
// if so how are permissions written? Is there a route to submit permissions about a stored file?
// if no permissions submitted is it assumed to be public? If public, who can delete it?
// should this API route just be a map to the store app that runs separately, and is accessed via gateway?
// so multiple API machines can be running and send requests to the store, and the gateway routes to wherever it actually is
// which would have to be a local route so that it was not exposed to the wider internet directly

// add logging of which users get, put, post, delete stuff in the store? probably.

store_receiver = new Mongo.Collection("store_receiver");
CLapi.addCollection(store_receiver);

CLapi.addRoute('store', {
  get: {
    //authRequired: true,
    action: function() {
      // which users can access the store content listing? Any authenticated user?
      return CLapi.internals.store.run();
    }
  }
});


var storeprocs = {
  // put stuff in a public folder, and serve it direct from nginx. So anything that needs no auth can just be retrieved directly via nginx
  // anything private should indicate itself as so, and go into private folder
  get: {
    action: function() {
      // if this is a directory return the directory listing - if authorised to view it
      // which users can get certain files, and how can I serve the file directly?
      // if the route is to the public directory it should ideally be served directly by nginx, but if not, check here
      // if the route is the private directory, then we must check the auth of the user
      var rt = '';
      for ( var up in this.urlParams ) rt += this.urlParams[up] + '/';
      return CLapi.internals.store.run(rt);
    }
  },
  put: {
    authRequired: true,
    action: function() {
      // PUT to create directories
      // which users can create direcrtories?
      // is there then also implicit permissions on who can submit or access things in certain folders?
      // which users can set the private flag to save private content? - could be a paid feature, cos it will cost money to maintain
      return CLapi.internals.store.create(this.urlParams.join('/'),undefined,this.queryParams.private);
    }
  },
  post: {
    authRequired: true,
    action: function() {
      // which users can post files, and where can they post them to?
      // could put files in directory structure that mirrors groups and roles, 
      // putting files in the location of the lowest role that should be able to access them
      // which users can set the private flag to save private content? - could be a paid feature, cos it will cost money to maintain
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
      return CLapi.internals.store.create(this.urlParams.join('/'),content,this.queryParams.private);
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      // which users can delete files, and which ones can they delete?
      return CLapi.internals.store.delete(this.urlParams.join('/'));
    }
  }
}

// rather bloody stupidly it seems there is no way to pass arbitrary depth routes into node.js - 
// all the way down to the connect module which seems to underlie everything, it splits at / before doing anything else
// so, short of writing a new connect module altogether (not too hard) and making everything else I used depend on it instead
// of the default, (hard), do the following for all desired routes.
var root = 'store';
for ( var r = 0; r < 20; r++ ) {
  root += '/:r' + r.toString();
  CLapi.addRoute(root, storeprocs);
}
               
// a one-time method for unauthenticated users to submit content to the store.
// useful when requesting people to submit stuff we might want, like oabutton asking authors to submit copies of articles
CLapi.addRoute('store/receive/:rid', { 
  get: {
    authRequired: true,
    action: function() {
      // create a receiver record so that a one-time POST of content to this URL wil work
      var rid = CLapi.internals.store.receiver();
      return {status: 'success', data: rid}
    }
  },
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
      return CLapi.internals.store.receive(this.urlParams.rid,content,this.queryParams.private);
    }
  }
});


CLapi.internals.store = {};
CLapi.internals.store.run = function(path,action,content,private) {
  var fs = Meteor.npmRequire('fs');
  var place = Meteor.settings.store.publicFolder;
  var fileurl = Meteor.settings.store.publicUrl;
  var privatepart = Meteor.settings.store.privateUrl.replace(Meteor.settings.store.publicUrl,'').replace('/','');
  if (private || path !== undefined && path.replace('/','').indexOf(privatepart) === 0) {
    place = Meteor.settings.store.privateFolder;
    fileurl = Meteor.settings.store.privateUrl;
  }
  if ( path !== undefined ) {
    if (path.lastIndexOf('/', 0) === 0 ) path = path.substring(1,path.length);
    if (path.substring(path.length-1,path.length) === '/' && action !== 'list' ) path = path.substring(0,path.length-1);
    if ( path.indexOf('../') !== -1 || path.indexOf('//') !== -1 ) {
      path = undefined; // don't accept naughty paths
      // add other path name checks in here if necessary
      action = 'list'; // default to just listing the top level contents instead
    }
    if (path === '/' || path.length === 0) path = undefined;
  }
  if ( path !== undefined ) place += '/' + path;
  if ( action === undefined ) action = 'retrieve';
  if (action === 'list') {
    return fs.readdirSync(place); // should return a directory listing
  } else if (path && (action === 'create' || action === 'update') ) {
    if (content === undefined) {
      // create the directory at the place specified, but not on the root, so there has to be a path
      if (!fs.existsSync(place)) fs.mkdirSync(place);
    } else {
      fs.writeFileSync(place,content);
    }
    return {status:'success', data: fileurl + '/' + path};
  } else if (action === 'retrieve' || action === undefined) {
    try {
      // can we properly serve static files here, with filetype etc? should really be handled by nginx anyway, if not private. But what if private?
      return fs.readFileSync(place).toString(); 
    } catch(err) {
      // should we check for a directory here? and if so provide the listing? or just throw the error?
      // in which case people should use the "list" command...
      try {
        return fs.readdirSync(place); // should return a directory listing
      } catch(err) {
        return {statusCode: 404, body: {status: 'error', data: '404 file not found'} }
      }
    }
  } else if (action === 'delete' && path) {
    // delete the file or directory at the place, as long as there is a path - don't do on the root.
    fs.unlinkSync(place);
    return {status:'success'}
  }
}

CLapi.internals.store.create = function(path,content,private) {
  return CLapi.internals.store.run(path,'create',content,private);
};
CLapi.internals.store.retrieve = function(path) {
  return CLapi.internals.store.run(path);
};
CLapi.internals.store.update = function(path,content) {
  return CLapi.internals.store.run(path,'create',content);
};
CLapi.internals.store.delete = function(path) {
  return CLapi.internals.store.run(path,'delete');
};

CLapi.internals.store.receiver = function(meta) {
  if ( meta === undefined ) meta = {};
  var s = store_receiver.insert(meta);
  return s;
}
CLapi.internals.store.receive = function(rid,content,private) {
  var r = store_receiver.findOne(rid);
  store_receiver.remove(rid); // this can only be used once
  var saved = CLapi.internals.store.run(rid,'create',content,private);
  r.stored = saved.data;
  return r;
}
