
// link shortener
// use a setting to set the URL route that we will resolve - ctg.li

Shortlinks = new Mongo.Collection("shortlinks");
CLapi.addCollection(Shortlinks); // temp useful to view all the created links

CLapi.addRoute('shortlink', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a shortlink for any given URL'} };
    }
  },
  post: function() {
    try {
      return CLapi.internals.shortlink(this.request.body.url);
    } catch(err) {
      return CLapi.internals.shortlink(this.queryParams.url);
    }
  }
});

CLapi.addRoute('shortlink/:shortid', {
  get: function() {
    if ( this.urlParams.shortid === 'random' && this.queryParams.url ) {
      // may want to disbale this eventually as it makes it easy to flood the server, if auth is added on other routes
      return CLapi.internals.shortlink(this.queryParams.url,this.urlParams.shortid);
    } else {
      // find the short ID and redirect to the link stored for it
      var exists = Shortlinks.findOne(this.urlParams.shortid);
      if (exists) {
        console.log('Redirecting ' + this.urlParams.shortid + ' to ' + exists.url);
        return {
          statusCode: 302,
          headers: {
            'Content-Type': 'text/plain',
            'Location': exists.url
          },
          body: 'Location: ' + exists.url
        };
      } else {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'text/plain'
          },
          body: '404 NOT FOUND'
        };
      }
    }
  },
  put: {
    authRequired: true,
    action: function() {
      // certain user groups can overwrite a shortlink
      // TODO: overwrite a short link ID that already exists, or error out
    }
  },
  post: function() {
    try {
      return CLapi.internals.shortlink(this.request.body.url,this.urlParams.shortid);
    } catch(err) {
      return CLapi.internals.shortlink(this.queryParams.url,this.urlParams.shortid);
    }
  },
  delete: {
    //authRequired: true,
    action: function() {
      // only certain group users can delete created shortlink 
      var exists = Shortlinks.findOne(this.urlParams.shortid);
      if (exists !== undefined) {
        Shortlinks.remove(exists._id);
        return {status: 'success'}
      } else {
        return {statusCode: 404, body:{status: 'error', data:'404 Not Found'}};
      }
    }
  }
});

CLapi.internals.shortlink = function(url,shortid) {
  if (url === undefined) return {statusCode:400, headers: {'Content-Type':'application/json'}, body: 'URL required'};
  if (url.indexOf('http') !== 0) url = 'http://' + url;
  console.log('shortlinking ' + url + ' ' + shortid);
  var s, sc, status, data, spre;
  spre = Shortlinks.findOne({url:url});
  if ( (shortid === undefined || shortid === 'random') && spre !== undefined ) {
    // if we have already shortlinked the exact same URL, just retrieve the same shortcode for it
    s = spre._id;
  } else {
    var obj = {url:url};
    if (shortid !== 'random' && shortid !== undefined) obj._id = shortid;
    // TODO could add a nice short ID generator here
    s = Shortlinks.insert(obj);
  }
  if (s !== undefined) {
    sc = 200;
    status = 'success';
    data = s;
  } else {
    sc = 400;
    status = 'error';
    data = 'shortlink named ' + shortid + ' is not available for URL ' + url;
  }
  return {
    statusCode: sc,
    headers: {'Content-Type': 'application/json'},
    body: {status: status, data: data}
  };
}


