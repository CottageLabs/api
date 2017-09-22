
// use oadoi

CLapi.addRoute('use/oadoi', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns oadoi answers'} };
    }
  }
});

CLapi.addRoute('use/oadoi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.oadoi.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.addRoute('use/oadoi/search', {
  get: {
    action: function() {
      if (this.queryParams.q) {
        return CLapi.internals.use.crossref.works.search(this.queryParams.q, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
      } else {
        return {status: 'success', data: {info: 'Could be a search query param onto oadoi, but just now they only do DOI so no need'} };
      }
    }
  }
});

CLapi.internals.use.oadoi = {};

CLapi.internals.use.oadoi.doi = function(doi) {
  var url = 'https://api.oadoi.org/v2/' + doi + '?email=mark@cottagelabs.com';
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      return { status: 'success', data: res.data} // best oa location is null when nothing found
    } else {
      return { status: 'error', data: res.data}
    }
  } catch(err) {
    return { status: 'error', data: '404 not found'}    
  }
}

CLapi.internals.use.oadoi.search = function(qrystr,from,size,filter) {
  return {}
}

