
// elasticsearch API

// handle authn and authz for es indexes and types (and possibly backup triggers)
// NOTE: if an index/type can be public, just make it public and have nginx route to it directly, saving app load.

CLapi.addRoute('es/import', {
  post: {
    authRequired: true,
    roleRequired: 'root', // decide which roles should get access - probably within the function, depending on membership of corresponding groups
    action: function() {
      return {status: 'success', data:CLapi.internals.es.import(this.request.body)};
    }
  }
});

var esaction = function(user,action,urlp,params,data) {
  var rt = '';
  for ( var up in urlp ) rt += '/' + urlp[up];
  if (params) {
    rt += '?';
    for ( var op in params ) rt += op + '=' + params[op] + '&';
  }
  // unless the user is in global root group, check that the url is in the allowed routes
  // also check that the user is in the necessary group to access the route
  // so there needs to be an elasticsearch group that gives user permissions on certain roles, like blocked_GET, or something like that
  var allowed = Meteor.settings.es.routes;
  return CLapi.internals.es.query(action,rt,data);
}

var es = {
  get: {
    authRequired: true,
    action: function() { return esaction(Meteor.userId, 'GET', this.urlParams, this.queryParams); }
  },
  post: {
    authRequired: true,
    action: function() { return esaction(Meteor.userId, 'POST', this.urlParams, this.queryParams, this.request.body); }
  },
  put: {
    authRequired: true,
    action: function() { return esaction(Meteor.userId, 'PUT', this.urlParams, this.queryParams, this.request.body); }
  },
  delete: {
    authRequired: true,
    action: function() { return esaction(Meteor.userId, 'DELETE', this.urlParams, this.queryParams, this.request.body); }
  }
}

CLapi.addRoute('es', es);
CLapi.addRoute('es/:ra', es);
CLapi.addRoute('es/:ra/:rb', es);
CLapi.addRoute('es/:ra/:rb/:rc', es);

CLapi.internals.es = {};
CLapi.internals.es.map = function(route,map) {
  console.log('creating es mapping for ' + route);
  if ( map === undefined ) map = Meteor.http.call('GET','http://static.cottagelabs.com/mapping.json').data;
  if ( route.indexOf('/') !== 0 ) route = '/' + route;
  var routeparts = route.substring(1,route.length).split('/');
  var db = Meteor.settings.es.url + '/' + routeparts[0];
  try {
    var dbexists = Meteor.http.call('HEAD',db);
  } catch(err) {
    Meteor.http.call('POST',db);
  }
  var maproute = db + '/_mapping/' + routeparts[1];
  if ( Meteor.settings.es.version > 1 ) maproute = db + '/' + routeparts[1] + '/_mapping';
  return Meteor.http.call('PUT',maproute,{data:map});
}
CLapi.internals.es.query = function(action,route,data) {
  console.log('Performing elasticsearch ' + action + ' on ' + route + ' for data ' + JSON.stringify(data));
  var esurl = Meteor.settings.es.url + route;
  // check if route to indextype exists, if it does not, autocreate with default mapping
  if (route.indexOf('/_') === -1 && route.split('/').length === 4 && (action === 'POST' || action === 'PUT')) {
    try {
      var exists = Meteor.http.call('HEAD',esurl);
    } catch(err) {
      CLapi.internals.es.map(route);
    }
  }
  var opts = {}
  if (data) opts.data = data;
  return Meteor.http.call(action,esurl,opts).data;
}
CLapi.internals.es.insert = function(route,data) {
  return CLapi.internals.es.query('POST',route,data);
}
CLapi.internals.es.delete = function(route) {
  return CLapi.internals.es.query('DELETE',route);
}

CLapi.internals.es.import = function(data,format,index,type,url,bulk,mappings,ids) {
  console.log('starting es import');
  if (ids === undefined) ids = 'es';
  if (bulk === undefined) {
    bulk = 1; // this should default to 10000 or something
  } else if (bulk === false) {
    bulk = 1;
  }
  if (url === undefined) url = Meteor.settings.es.url;
  var rows;
  if (format === 'esquery' || format === undefined) {
    rows = data.hits.hits;
  } else {
    rows = data;
  }
  if (!Array.isArray(rows)) rows = [rows];
  var recs = [];
  var counter = 0;
  var failures = 0;
  var dump = '';
  // TODO if mappings are provided, load them first
  for ( var i in rows ) {
    var rec = rows[i]._source !== undefined ? rows[i]._source : rows[i]._fields;
    var tp = type !== undefined ? type : rows[i]._type;
    var idx = index !== undefined ? index : rows[i]._index;
    var id;
    if (ids) {
      id = ids === true || ids === 'es'? rows[i]._id : rec[ids];
    }
    var addr = url;
    if ( bulk === 1 ) {
      console.log('singular import to es');
      addr += '/' + idx + '/' + tp;
      if (id !== undefined) addr += '/' + id;
      try {
        Meteor.http.call('POST',addr,{data:rec});
      } catch(err) {
        failures += 1;
      }
    } else {
      console.log('bulk importing to es');
      counter += 1;
      var meta = {"index": {"_index": idx, "_type":tp}};
      if (id !== undefined) meta.index._id = id;
      dump += JSON.stringify(meta) + '\n';
      dump += JSON.stringify(rec) + '\n';
      if ( counter === bulk || i === rows.length-1 ) {
        // TODO for now it is impossible to bulk load because of yet more fucking ridiculously terrible handling of files in node...
      }
    }
  }
  console.log(rows.length + ' ' + failures);
  return {records:rows.length,failures:failures};
}


