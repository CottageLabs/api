

// simply returns some info about the address requesting it.
// could be extended to lookup geo etc

CLapi.addRoute('requestinfo', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.requestinfo(this.request,this.queryParams.locate) }
    }
  },
  post: {
    action: function() {
      return {status: 'success', data: CLapi.internals.requestinfo(this.request,this.queryParams.locate) }
    }    
  }
});

CLapi.addRoute('locate', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.locate(this.queryParams.ip) }
    }
  },
  post: {
    action: function() {
      return {status: 'success', data: CLapi.internals.requestinfo(this.request.body.ip) }
    }    
  }
});

CLapi.internals.requestinfo = function(request,locate) {
  // useful stuff for having a look at what is there and dumping it out to the return object if desired
  // could add geo lookup here, etc
  var obj = {ip: request.headers['x-real-ip'], forwarded: request.headers['x-forwarded-for']};
  var keys = [];
  for ( var k in request ) {
    //keys.push(k);
    if ( k === 'domain' || k === 'headers' || k === 'url' ) obj[k] = request[k];
  }
  obj.keys = keys;
  if (locate) obj.location = CLapi.internals.locate(obj.ip);
  return obj;
}

CLapi.internals.locate = function(ip,request) {
  // NOTE - it is better to user browser built-in geolocation where possible, 
  // or access the google location services API directly from the client, 
  // because it can be more accurate based on cell info and wireless ssid info
  // that cannot otherwise be retrieved, so this should be considered a fallback 
  // to locate only by IP - for example my IP appears as London, via the virgin network point, presumably
  // also this service will only work 1000 times a day on the free plan
  if (ip === undefined) ip = request.headers['x-real-ip'];
  console.log('Using ipinfo service to locate ' + ip);
  var url = 'http://ipinfo.io/' + ip + '/json';
  try {
    return Meteor.http.call('GET',url).data;
  } catch(err) {
    console.log(err);
    return {status:'error',error:err}
  }
}

