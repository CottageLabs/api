

// simply returns some info about the address requesting it.
// could be extended to lookup geo etc

CLapi.addRoute('requestinfo', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.requestinfo(this.request) }
    }
  },
  post: {
    action: function() {
      return {status: 'success', data: CLapi.internals.requestinfo(this.request) }
    }    
  }
});

CLapi.internals.requestinfo = function(request) {
  // useful stuff for having a look at what is there and dumping it out to the return object if desired
  // could add geo lookup here, etc
  /*var keys = [];
  var obj = {};
  for ( var k in request ) {
    keys.push(k);
    if ( k === 'domain' || k === 'headers') obj[k] = request[k];
  }*/
  return {ip: request.headers['x-real-ip'], forwarded: request.headers['x-forwarded-for']};
}
