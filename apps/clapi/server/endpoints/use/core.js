
// NOTE CORE IS STILL NOT PROVIDING RELIABLE RESULTS, A DOI SEARCH ON OUR USUAL OPEN BIBLIO PAPER RETURNS WRONG ANSWERS. PRETTY USELESS

// core docs:
// http://core.ac.uk/docs/
// http://core.ac.uk/docs/#!/articles/searchArticles
// http://core.ac.uk:80/api-v2/articles/search/doi:"10.1186/1471-2458-6-309"


CLapi.addRoute('use/core', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi.internals.use.core ) routes.push(k);
      return {status: 'success', routes: routes, data: {info: 'returns responses from the core API. Append a DOI to this URL'} };
    }
  }
});

CLapi.addRoute('use/core/articles/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.core.articles.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.addRoute('use/core/articles/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.core.articles.search(this.urlParams.qry, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.internals.use.core = {articles:{}};

CLapi.internals.use.core.articles.doi = function(doi) {
  var apikey = Meteor.settings.CORE_apikey;
  if ( !apikey ) return { status: 'error', data: 'NO CORE API KEY PRESENT!'}
  var url = 'http://core.ac.uk/api-v2/articles/search/doi:"' + doi + '"?urls=true&apiKey=' + apikey;
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.statusCode === 200 ) {
    if ( res.data.totalHits === 0 ) {
      return { status: 'success', data: res.data}
    } else {
      var ret = res.data.data[0];
      for ( var i in res.data.data ) {
        if ( res.data.data[i].hasFullText === "true" ) {
          ret = res.data.data[i];
          break;
        }
      }
      return { status: 'success', data: ret}
    }
  } else {
    return { status: 'error', data: res}
  }
}

CLapi.internals.use.core.articles.search = function(qrystr,from,size) {
  // assume incoming query string is of ES query string format
  // assume from and size are ES typical
  // but core only accepts certain field searches:
  // title, description, fullText, authorsString, publisher, repositoryIds, doi, identifiers, language.name and year
  // for paging core uses "page" from 1 (but can only go up to 100?) and "pageSize" defaulting to 10 but can go up to 100
  var apikey = Meteor.settings.CORE_apikey;
  if ( !apikey ) return { status: 'error', data: 'NO CORE API KEY PRESENT!'}
  var qry = '"' + qrystr.replace(/\w+?\:/g,'') + '"'; // TODO have this accept the above list
  var url = 'http://core.ac.uk/api-v2/articles/search/' + qry + '?urls=true&apiKey=' + apikey;
  if (!size) size = 10;
  if (size !== 10) url += '&pageSize=' + size;
  if (from) url += '&page=' + (Math.floor(from/size)+1);
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.statusCode === 200 ) {
    return { status: 'success', total: res.data.totalHits, data: res.data.data}    
  } else {
    return { status: 'error', data: res}
  }
}
