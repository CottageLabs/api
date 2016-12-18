
// elasticsearch API

// handle authn and authz for es indexes and types (and possibly backup triggers)
// NOTE: if an index/type can be public, just make it public and have nginx route to it directly, saving app load.

CLapi.addRoute('es/status', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.es.status()};
    }
  }
});

CLapi.addRoute('es/check', {
  get: {
    roleRequired: 'root', // decide which roles should get access - probably within the function, depending on membership of corresponding groups
    action: function() {
      return {status: 'success', data: CLapi.internals.es.check()};
    }
  }
});

CLapi.addRoute('es/import', {
  post: {
    roleRequired: 'root', // decide which roles should get access - probably within the function, depending on membership of corresponding groups
    action: function() {
      return {status: 'success', data: CLapi.internals.es.import(this.request.body)};
    }
  }
});

var esaction = function(uid,action,urlp,params,data) {
  var rt = '';
  for ( var up in urlp ) rt += '/' + urlp[up];
  if (params) {
    rt += '?';
    for ( var op in params ) rt += op + '=' + params[op] + '&';
  }
  // unless the user is in global root group, check that the url is in the allowed routes
  // also check that the user is in the necessary group to access the route
  // so there needs to be an elasticsearch group that gives user permissions on certain roles, like blocked_GET, or something like that
  var user = uid ? CLapi.internals.accounts.retrieve(uid) : undefined;
  var allowed = user && CLapi.internals.accounts.auth('root',user) ? true : false; // should the root user get access to everything or only the open routes?
  // NOTE that the call to this below still requires user auth on PUT and DELETE, so there cannot be any public allowance on those
  if (!allowed) {
    var open = Meteor.settings.es.routes;
    for ( var o in open ) {
      if (!allowed && rt.indexOf(o) === 0) {
        var ort = open[o];
        if (ort.public) {
          allowed = true;
        } else if (user) {
          // if part of the route is listed in the list of open routes, then a user who is in a group matching
          // the name of the route without slashes will have some permissions on that index
          if (action === 'GET' && CLapi.internals.accounts.auth(ort+'.read',user)) {
            allowed = true; // any user in the group can GET
          } else if (action === 'POST' && CLapi.internals.accounts.auth(ort+'.edit',user)) {
            allowed = true;
          } else if (action === 'PUT' && CLapi.internals.accounts.auth(ort+'.publish',user)) {
            allowed = true;
          } else if (action === 'DELETE' && CLapi.internals.accounts.auth(ort+'.owner'),user) {
            allowed = true;
          }
          // also the settings for the route may declare actions and groups that can perform that action
          // other settings could go in there too, but this has yet to be implemented
        }
      }
    }
  }
  if (allowed) {
    if (urlp.rc === '_facet' && urlp.rd !== undefined) {
      return CLapi.internals.es.facet(urlp.ra,urlp.rb,urlp.rd);
    } else {
      return CLapi.internals.es.query(action,rt,data);
    }
  } else {
    return {statusCode:401,body:{status:"error",message:"401 unauthorized"}}
  }
}

var es = {
  get: {
    action: function() {
      var uid = this.request.headers['x-apikey'] ? this.request.headers['x-apikey'] : this.queryParams.apikey;
      if (JSON.stringify(this.urlParams) === '{}' && JSON.stringify(this.queryParams) === '{}') {
        return {status:"success"}
      } else {
        return esaction(uid, 'GET', this.urlParams, this.queryParams);
      }
    }
  },
  post: {
    action: function() { 
      var uid = this.request.headers['x-apikey'] ? this.request.headers['x-apikey'] : this.queryParams.apikey;
      return esaction(Meteor.userId, 'POST', this.urlParams, this.queryParams, this.request.body); 
    }
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
CLapi.addRoute('es/:ra/:rb/:rc/:rd', es);

CLapi.internals.es = {};

CLapi.internals.es.map = function(route,map,url) {
  console.log('creating es mapping for ' + route);
  if ( map === undefined ) map = Meteor.http.call('GET','http://static.cottagelabs.com/mapping.json').data;
  if ( route.indexOf('/') !== 0 ) route = '/' + route;
  var routeparts = route.substring(1,route.length).split('/');
  var esurl = url ? url : Meteor.settings.es.url;
  var db = esurl + '/';
  if (Meteor.settings.dev_index && routeparts[0].indexOf('dev') !== 0) db += 'dev';
  db += routeparts[0];
  try {
    var dbexists = Meteor.http.call('HEAD',db);
  } catch(err) {
    Meteor.http.call('POST',db);
  }
  var maproute = db + '/_mapping/' + routeparts[1];
  if ( Meteor.settings.es.version < 1 ) maproute = db + '/' + routeparts[1] + '/_mapping';
  return Meteor.http.call('PUT',maproute,{data:map});
}

CLapi.internals.es.facet = function(index,type,key,url) {
  console.log('Performing elasticsearch facet on ' + index + ' ' + type + ' ' + key);
  var size = 100;
  var esurl = url ? url : Meteor.settings.es.url;
  var opts = {data:{query:{"match_all":{}},size:0,facets:{}}};
  opts.data.facets[key] = {terms:{field:key,size:size}};
  try {
    if (Meteor.settings.dev_index) index = 'dev' + index;
    var ret = Meteor.http.call('POST',esurl+'/'+index+'/'+type+'/_search',opts);
    return ret.data.facets[key].terms;
  } catch(err) {
    return {info: 'the call to es returned an error'}
  }
}

CLapi.internals.es.query = function(action,route,data,url) {
  if (url) console.log('To url ' + url);
  var esurl = url ? url : Meteor.settings.es.url;
  if (route.indexOf('/') !== 0) route = '/' + route;
  if (Meteor.settings.dev_index && route !== '/_status') {
    route = '/dev' + route.substring(1,route.length);
  }
  console.log('Performing elasticsearch ' + action + ' on ' + route);
  var routeparts = route.substring(1,route.length).split('/');
  // check if route to indextype exists, if it does not, autocreate with default mapping if this is a post or a put
  if (route.indexOf('/_') === -1 && routeparts.length >= 1 && action !== 'DELETE' && action !== 'GET') {
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
  var ret;
  try {
    ret = Meteor.http.call(action,esurl+route,opts).data;
  } catch(err) {
    //console.log(err);
    ret = {info: 'the call to es returned an error, but that may not necessarily be bad', err:err}
  }
  return ret;
}
CLapi.internals.es.insert = function(route,data,url) {
  return CLapi.internals.es.query('POST',route,data,url);
}
CLapi.internals.es.delete = function(route,url) {
  return CLapi.internals.es.query('DELETE',route,undefined,url);
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
    if (Meteor.settings.dev_index) {
      idx = 'dev' + idx;
      if (rows[i]._index) rows[i]._index = idx;
    }
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

CLapi.internals.es.status = function() {
  var s = CLapi.internals.es.query('GET','/_status');
  var status = {shards:{total:s._shards.total,successful:s._shards.successful},indices:{}};
  for (var i in s.indices) {
    status.indices[i] = {docs:s.indices[i].docs.num_docs,size:Math.ceil(s.indices[i].index.primary_size_in_bytes/1024/1024)};
  }
  return status;
}




