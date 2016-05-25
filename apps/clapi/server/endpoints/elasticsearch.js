
// elasticsearch API

// handle authn and authz for es indexes and types (and possibly backup triggers)
// NOTE: if an index/type can be public, just make it public and have nginx route to it directly, saving app load.

CLapi.addRoute('es/check', {
  get: {
    authRequired: true,
    roleRequired: 'root', // decide which roles should get access - probably within the function, depending on membership of corresponding groups
    action: function() {
      return {status: 'success', data:CLapi.internals.es.check()};
    }
  }
});

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

CLapi.internals.es.map = function(route,map,url) {
  console.log('creating es mapping for ' + route);
  if ( map === undefined ) map = Meteor.http.call('GET','http://static.cottagelabs.com/mapping.json').data;
  if ( route.indexOf('/') !== 0 ) route = '/' + route;
  var routeparts = route.substring(1,route.length).split('/');
  var esurl = url ? url : Meteor.settings.es.url;
  var db = esurl + '/' + routeparts[0];
  try {
    var dbexists = Meteor.http.call('HEAD',db);
  } catch(err) {
    Meteor.http.call('POST',db);
  }
  var maproute = db + '/_mapping/' + routeparts[1];
  if ( Meteor.settings.es.version < 1 ) maproute = db + '/' + routeparts[1] + '/_mapping';
  return Meteor.http.call('PUT',maproute,{data:map});
}

CLapi.internals.es.query = function(action,route,data,url) {
  console.log('Performing elasticsearch ' + action + ' on ' + route);
  var esurl = url ? url : Meteor.settings.es.url;
  var routeparts = route.substring(1,route.length).split('/');
  // check if route to indextype exists, if it does not, autocreate with default mapping
  if (route.indexOf('/_') === -1 && routeparts.length >= 1 && (action === 'POST' || action === 'PUT')) {
    try {
      var turl = esurl + '/' + routeparts[0];
      if (routeparts.length > 1) turl += '/' + routeparts[1];
      var exists = Meteor.http.call('HEAD',turl);
    } catch(err) {
      CLapi.internals.es.map(route);
    }
  }
  var opts = {}
  if (data) opts.data = data;
  return Meteor.http.call(action,esurl+route,opts).data;
}
CLapi.internals.es.insert = function(route,data,url) {
  return CLapi.internals.es.query('POST',route,data,url);
}
CLapi.internals.es.delete = function(route,url) {
  return CLapi.internals.es.query('DELETE',route,url);
}

CLapi.internals.es.import = function(data,format,index,type,url,bulk,mappings,ids) {
  console.log('starting es import');
  if (format === undefined) format = 'es';
  if (ids === undefined) ids = 'es';
  if (bulk === undefined) {
    bulk = 10000;
  } else if (bulk === false) {
    bulk = 1;
  }
  if (url === undefined) url = Meteor.settings.es.url;
  var rows = format === 'es' ? data.hits.hits : data;
  if (!Array.isArray(rows)) rows = [rows];
  var recs = [];
  var counter = 0;
  var failures = 0;
  var dump = '';
  // TODO if mappings are provided, load them first
  if (mappings) {
    for ( var m in mappings ) {
      var madr = url + '/' + m;
      var map = mappings[m] ? mappings[m] : undefined;
      CLapi.internals.es.map(madr,map);
    }
  }
  var bulkinfo = [];
  for ( var i in rows ) {
    var rec;
    if (format === 'es') {
      rec = rows[i]._source !== undefined ? rows[i]._source : rows[i]._fields;
    } else {
      rec = rows[i];
    }
    var tp = type !== undefined ? type : rows[i]._type;
    var idx = index !== undefined ? index : rows[i]._index;
    var id, addr;
    if (ids) {
      id = ids === true || ids === 'es'? rows[i]._id : rec[ids];
    }
    if ( bulk === 1 ) {
      console.log('es import doing singular insert');
      addr = url + '/' + idx + '/' + tp;
      if (id !== undefined) addr += '/' + id;
      try {
        Meteor.http.call('POST',addr,{data:rec});
      } catch(err) {
        failures += 1;
      }
    } else {
      counter += 1;
      var meta = {"index": {"_index": idx, "_type":tp}};
      if (id !== undefined) meta.index._id = id;
      dump += JSON.stringify(meta) + '\n';
      dump += JSON.stringify(rec) + '\n';
      if ( (counter === bulk || i == (rows.length - 1) ) && idx && tp ) { // NOTE THIS: i as an iterator is a string not a number, so === would return false...
        console.log('bulk importing to es');
        addr = url + '/_bulk';
        var b = CLapi.internals.post(addr,dump);
        bulkinfo.push(b);
        dump = '';
        counter = 0;
      }
    }
  }
  console.log(rows.length + ' ' + failures);
  return {records:rows.length,failures:failures,bulk:bulkinfo};
}

CLapi.internals.es.check = function() {
  console.log('starting es check');
  var bulks = [{hello:"world"},{hello:"heaven"}];
  var bulksub = CLapi.internals.es.import(bulks,false,'clapi_test','test_type');
  console.log(bulksub);
  var sub = CLapi.internals.es.insert('/clapi_test/bulk_test_type',{hello:"hell"});
  console.log(sub);
  var r = CLapi.internals.es.query('GET','/clapi_test/_refresh');
  var res = CLapi.internals.es.query('GET','/clapi_test/_search');
  console.log(res);
  var found = {world:false,heaven:false,hell:false};
  for ( var i in res.hits.hits ) {
    if (res.hits.hits[i]._source.hello === 'world') found.world = true;
    if (res.hits.hits[i]._source.hello === 'heaven') found.heaven = true;
    if (res.hits.hits[i]._source.hello === 'hell') found.hell = true;
  }
  var success = found.world && found.heaven && found.hell && res.hits.total === 3;
  console.log(success);
  var deleted = CLapi.internals.es.delete('/clapi_test');
  console.log(deleted);
  return {
    sub:sub,
    bulk:bulksub,
    query:res,
    found:found,
    deleted:deleted,
    success:success,
    status:'success,change,error'
  }
}





