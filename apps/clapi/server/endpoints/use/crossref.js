
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
      if (this.queryParams.q) {
        return CLapi.internals.use.crossref.works.search(this.queryParams.q, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
      } else {
        return {status: 'success', data: {info: 'Pass a search to crossref works search by appending search terms as subroute to this route. \
          Use elasticsearch query string style, we will convert it. Use search/all for search everything. Also crossref filters can be passed in as \
          the "filter" query param. For example filter=from-pub-date:2014-01-01,issn:2212-6716'} };
      }
    }
  }
});

// TODO probably can deprecate this one
CLapi.addRoute('use/crossref/works/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.works.search(this.urlParams.qry, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
    }
  }
});

CLapi.addRoute('use/crossref/works/published/:startdate', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.works.published(this.urlParams.startdate, undefined, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
    }
  }
});
CLapi.addRoute('use/crossref/works/published/:startdate/:enddate', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.works.published(this.urlParams.startdate, this.urlParams.enddate, this.queryParams.from, this.queryParams.size, this.queryParams.filter);
    }
  }
});

CLapi.addRoute('use/crossref/reverse', {
  get: {
    action: function() {
      return CLapi.internals.use.crossref.reverse([this.queryParams.q],this.queryParams.score);
    }
  },
  post: {
    action: function() {
      return CLapi.internals.use.crossref.reverse(this.request.body);
    }
  }
});

CLapi.internals.use.crossref = {works:{}};

CLapi.internals.use.crossref.reverse = function(citations,score) {
  // citations should be a JSON list with strings relevant to the article to be found
  if (typeof citations === 'string') citations = [citations];
  // out of about 80 tests, 50 match on titles. Setting score to 35 would lose about 9, but gain about 20 that did not match
  // of that 20 some are correct anyway because of different versions e.g. in anthologies etc- but if we have no DOI at all, that is still useful.
  // score below 20 is basically worthless, perhaps does not exist - actually not true, my usual obstm test article scores 19.... with exact title match
  // but between 20 and 35 there are some right and some wrong, oddly some with almost exact titles and others wildly different
  // https://static.cottagelabs.com/xreftest.csv
  // lowercasing and/or removing non-ascii chars before querying crossref makes little to no difference.
  // so the best we can do is, if score is high, let's say above 50, accept it. Otherwise, see how many terms from the citation can be found in the title - boost to over 50 for high matches
  // it is likely that most citations we receive will be a title anyway, or at least start with one.
  // also, this is probably only useful for journal articles, so throw anything that is not a journal-article type
  if (score === undefined) score = 80; // cranking up to 80, as crossref on its own even with full citation can get wrong things too much
  var url = 'http://api.crossref.org/reverse';
  var res = Meteor.http.call('POST', url, {data:citations});
  if ( res.statusCode === 200 ) {
    if ( res.data && res.data.message && res.data.message.DOI && res.data.message.score && res.data.message.type === 'journal-article' ) {
      var sc = res.data.message.score;
      if ( sc < score ) {
        // assuming a citation either matches highly on additional data or has a title in it but does not match highly, try to match title to part of citation
        // once number gets high enough, assume match has occurred
        var ignore = ["a","an","and","are","as","at","but","be","by","do","for","if","in","is","it","or","so","the","to"];
        var titleparts = res.data.message.title[0].toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9]/g,' ').split(' ');
        var titles = [];
        for ( var f in titleparts ) {
          if (ignore.indexOf(titleparts[f].split("'")[0]) === -1 && titleparts[f].length > 0) titles.push(titleparts[f]);
        }
        var citeparts = citations.join(' ').toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9]/g,' ').replace(/  /g,' ').split(' ');
        var cites = [];
        for ( var c in citeparts ) {
          if (ignore.indexOf(citeparts[c].split("'")[0]) === -1 && citeparts[c].length > 1) cites.push(citeparts[c]);
        }
        var bonus = (score - sc)/titles.length + 1;
        var found = [];
        // could just look for the title string inside the cite string, but the idea here is later could boost based on find count, or word order, so more flexibility for future attempts
        for ( var w in titles ) {
          if (cites.indexOf(titles[w]) !== -1) found.push(w);
        }
        if (titles.length === found.length && found.join() === found.sort().join()) sc += bonus * found.length;
      }
      if ( sc >= score ) {
        return { status: 'success', data: {doi:res.data.message.DOI, title:res.data.message.title[0], received:res.data.message.score, adjusted: sc}, original:res.data}
      } else {
        return { status: 'success', data: {info: 'below score', received:res.data.message.score, adjusted: sc}, original:res.data}
      }
    } else {
      return { status: 'success', data: {info: 'not found'}}
    }
  } else {
    return { status: 'error', data: res}
  }  
}

CLapi.internals.use.crossref.works.doi = function(doi) {
  var url = 'http://api.crossref.org/works/' + doi;
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      return { status: 'success', data: res.data.message}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: '404 not found'}    
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
    var qry = qrystr.replace(/\w+?\:/g,'').replace(/ AND /g,'+').replace(/ OR /g,' ').replace(/ NOT /g,'-').replace(/ /g,'+');
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

CLapi.internals.use.crossref.works.published = function(startdate,enddate,from,size,filter) {
  // using ?filter=from-pub-date:2004-04-04,until-pub-date:2004-04-04 (the dates are inclusive)
  filter !== undefined ? filter += ',' : filter = '';
  filter += 'from-pub-date:' + startdate;
  if (enddate) filter += ',until-pub-date:' + enddate;
  return CLapi.internals.use.crossref.works.search(undefined,from,size,filter);
}

CLapi.internals.use.crossref.works.indexed = function(startdate,enddate,from,size,filter) {
  filter !== undefined ? filter += ',' : filter = '';
  filter += 'from-index-date:' + startdate;
  if (enddate) filter += ',until-index-date:' + enddate;
  return CLapi.internals.use.crossref.works.search(undefined,from,size,filter);
}

