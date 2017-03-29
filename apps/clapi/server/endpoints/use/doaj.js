
// use the doaj
// https://doaj.org/api/v1/docs

CLapi.addRoute('use/doaj', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the DOAJ API route'} };
    }
  }
});

CLapi.addRoute('use/doaj/articles/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.doaj.articles.search(this.urlParams.qry);
    }
  }
});

CLapi.addRoute('use/doaj/articles/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.doaj.articles.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.addRoute('use/doaj/journals/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.doaj.journals.search(this.urlParams.qry);
    }
  }
});

CLapi.addRoute('use/doaj/journals/issn/:issn', {
  get: {
    action: function() {
      return CLapi.internals.use.doaj.journals.issn(this.urlParams.issn);
    }
  }
});


CLapi.internals.use.doaj = {journals: {}, articles: {}};

CLapi.internals.use.doaj.journals.issn = function(issn) {
  var r = CLapi.internals.use.doaj.journals.search('issn:' + issn);
  if ( r.data.results && r.data.results.length) {
    return {status:'success', data: r.data.results[0]}
  } else {
    return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
  }
}

// title search possible with title:MY JOURNAL TITLE
CLapi.internals.use.doaj.journals.search = function(qry,params) {
  var url = 'https://doaj.org/api/v1/search/journals/' + qry;
  if (params) {
    url += '?';
    for ( var op in params ) url += op + '=' + params[op] + '&';
  }
  console.log(url);
  var res = Meteor.http.call('GET',url);
  if (res.statusCode === 200) {
    return {status: 'success', data: res.data}
  } else {
    return {status: 'error', data: res.data}
  }
}

// title search possible with title:MY JOURNAL TITLE
CLapi.internals.use.doaj.articles.doi = function(doi) {
  var url = 'https://doaj.org/api/v1/search/articles/doi:' + doi;
  console.log(url);
  var res = Meteor.http.call('GET',url);
  if (res.statusCode === 200 && res.data && res.data.results && res.data.results.length > 0) {
    return {status: 'success', data: res.data.results[0]}
  } else {
    return {status: 'error', data: res.data}
  }
}

// title search possible with title:MY JOURNAL TITLE
CLapi.internals.use.doaj.articles.search = function(qry,params) {
  var url = 'https://doaj.org/api/v1/search/articles/' + qry;
  if (params) {
    url += '?';
    for ( var op in params ) url += op + '=' + params[op] + '&';
  }
  console.log(url);
  var res = Meteor.http.call('GET',url);
  if (res.statusCode === 200) {
    return {status: 'success', data: res.data}
  } else {
    return {status: 'error', data: res.data}
  }
}
