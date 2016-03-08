
// elasticsearch API

// handle authn and authz for es indexes and types (and possibly backup triggers)
// NOTE: if an index/type can be public, just make it public and have nginx route to it directly, saving app load.

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

