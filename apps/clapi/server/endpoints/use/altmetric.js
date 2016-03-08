// an altmetric API user


CLapi.addRoute('use/altmetric', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the altmetric API functionality'} };
    }
  }
});

CLapi.addRoute('use/altmetric/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.altmetric.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.internals.use.altmetric = {};

// http://api.altmetric.com/
// http://api.altmetric.com/v1/doi/10.1038/480426a?callback=my_callback
// can also accept arxiv, pmid, uri
// and citations of articles in a given timeframe (which cannot be searched) http://api.altmetric.com/v1/citations/1d
// they would like requests to be not more than 1 per second

CLapi.internals.use.altmetric.doi = function(doi) {
  var url = 'http://api.altmetric.com/v1/doi/' + doi;
  if ( Meteor.settings.ALTMETRIC_key) url += '?key=' + Meteor.settings.ALTMETRIC_key;
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.statusCode === 200 ) {
    return { status: 'success', data: res.data}
  } else {
    return { status: 'error', data: res}
  }
}

