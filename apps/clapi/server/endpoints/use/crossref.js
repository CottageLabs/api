
// a crossref API client

// https://github.com/CrossRef/rest-api-doc/blob/master/rest_api.md

// http://api.crossref.org/works/10.1016/j.paid.2009.02.013

CLapi.addRoute('use/crossref', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi.internals.use.crossref ) routes.push(k);
      return {status: 'success', routes: routes, data: {info: 'returns a subset of the crossref API functionality'} };
    }
  }
});

CLapi.addRoute('use/crossref/works', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi.internals.use.crossref.works ) routes.push(k);
      return {status: 'success', routes: routes, data: {info: 'A subset of the crossref works API functionality'} };
    }
  }
});

CLapi.addRoute('use/crossref/works/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.works.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.addRoute('use/crossref/works/search', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Pass a search to crossref works search by appending search terms as subroute to this route. \
        Use elasticsearch query string style, we will convert it. Use search/all for search everything. Also crossref filters can be passed in as \
        the "filter" query param. For example filter=from-pub-date:2014-01-01,issn:2212-6716'} };
    }
  }
});

CLapi.addRoute('use/crossref/works/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.works.search(this.urlParams.qry, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
    }
  }
});

// TODO: add crossref published date listings
// using ?filter=from-pub-date:2004-04-04,until-pub-date:2004-04-04 (the dates are inclusive)

CLapi.internals.use.crossref = {works:{}};

CLapi.internals.use.crossref.works.doi = function(doi) {
  var url = 'http://api.crossref.org/works/' + doi;
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.statusCode === 200 ) {
    return { status: 'success', data: res.data.message}
  } else {
    return { status: 'error', data: res}
  }
}

CLapi.internals.use.crossref.works.search = function(qrystr,from,size,filter) {
  // assume incoming query string is of ES query string format whereas crossref takes dismax
  // e.g. renear AND NOT ontologies = renear+-ontologies
  // ursus arctos = ursus+arctos
  // ursus OR arctos = ursus+arctos (I think...)
  // ursus AND arctos = ursus+arctos
  // crossref uses "rows" defaulting to 20 and "offset" defaulting to 0. So map these to our expected ES inputs
  var url = 'http://api.crossref.org/works?';
  if (qrystr && qrystr !== 'all') {
    var qry = qrystr.replace(/\w+?\:/g,'').replace(/ AND /g,' ').replace(/ OR /g,' ').replace(/ NOT /g,'-').replace(/ /g,'+');
    url += 'query=' + qry;
  }
  if (from !== undefined) url += '&offset=' + from;
  if (size !== undefined) url += '&rows=' + size;
  if (filter !== undefined) url += '&filter=' + filter;
  url = url.replace('?&','?'); // tidy any params coming immediately after the start of search query param signifier, as it makes crossref error out
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.statusCode === 200 ) {
    return { status: 'success', total: res.data.message['total-results'], data: res.data.message.items, facets: res.data.message.facets}
  } else {
    return { status: 'error', data: res}
  }
}
