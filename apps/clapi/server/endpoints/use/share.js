// oabutton wants to use SHARE to find research articles
// https://github.com/OAButton/backend/issues/112

// https://share.osf.io/api/v2/search/abstractcreativework/_search

CLapi.addRoute('use/share', {
  get: {
    action: function() {
      return {status: 'success', routes: routes, data: {info: 'returns responses from the SHARE API.'} };
    }
  }
});

CLapi.addRoute('use/share/search', {
  get: {
    action: function() {
      return CLapi.internals.use.share.search(this.queryParams);
    }
  }
});

CLapi.addRoute('use/share/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.share.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});



CLapi.internals.use.share = {};

// list of sources that Share gets from:
// https://share.osf.io/api/v2/search/creativeworks/_search?&source=%7B%22query%22%3A%7B%22filtered%22%3A%7B%22query%22%3A%7B%22bool%22%3A%7B%22must%22%3A%5B%7B%22match_all%22%3A%7B%7D%7D%5D%7D%7D%7D%7D%2C%22from%22%3A0%2C%22size%22%3A0%2C%22aggs%22%3A%7B%22sources%22%3A%7B%22terms%22%3A%7B%22field%22%3A%22sources.raw%22%2C%22size%22%3A200%7D%7D%7D%7D
// then can find the identifiers provided for them and try to filter on that
// can also do title search on title

CLapi.internals.use.share.doi = function(doi) {
  // NOTE for now this does not work because SHARE appear to have indexed their data counter to their claimed functionality.
  // I have contacted them about it on 16/11/2016
  var res = CLapi.internals.use.share.search({q:'identifiers:"' + doi.replace('/','\/') + '"'});
  if (res.data.total > 0) {
    return res.data.hits[0];
  } else {
    return {};
  }
}

CLapi.internals.use.share.search = function(params) {
  // NOTE SHARE uses .raw to store some fields for exact matches rather than my more usual .exact suffix
  // their mapping: https://share.osf.io/api/v2/search/abstractcreativework/_mapping
  var url = 'https://share.osf.io/api/v2/search/creativeworks/_search';
  if (params) {
    url += '?';
    for ( var op in params ) url += op + '=' + params[op] + '&';
  }
  try {
    var res = Meteor.http.call('GET', url, {headers:{'Content-Type':'application/json'}});
    if ( res.statusCode === 200 ) {
      var ret = res.data.hits;
      return { status: 'success', data: ret}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: 'SHARE API error'}
  }

}