
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
      var score = this.queryParams.score && !isNaN(parseInt(this.queryParams.score)) ? parseInt(this.queryParams.score) : undefined;
      return CLapi.internals.use.crossref.reverse([this.queryParams.q],score,this.queryParams.metadata);
    }
  },
  post: {
    action: function() {
      var score = this.queryParams.score && !isNaN(parseInt(this.queryParams.score)) ? parseInt(this.queryParams.score) : undefined;
      return CLapi.internals.use.crossref.reverse(this.request.body,score,this.queryParams.metadata);
    }
  }
});

CLapi.internals.use.crossref = {works:{}};

CLapi.internals.use.crossref.reverse = function(citations,score,metadata) {
  // citations should be a JSON list with strings relevant to the article to be found
  if (typeof citations === 'string') citations = [citations];
  if (score === undefined) score = 35; // TODO set this higher after some testing
  // out of about 80 tests, 50 match on titles. Setting score to 35 would lose about 9, 
  // but gain about 20 that did not match
  // of that 20 some are correct anyway because of different versions e.g. in anthologies etc- but if we have no DOI at all, that is still useful.
  // score below 20 is basically worthless, perhaps does not exist
  // but between 20 and 35 there are some right and some wrong, oddly some with almost exact titles and others wildly different
  // https://static.cottagelabs.com/xreftest.csv
  // lowercasing and/or removing non-ascii chars before querying crossref makes little to no difference.
  // so throw away anything under 20, implememt a lowercase ascii title length and similarity score for those between 35 and 80, accept anything above 80
  var url = 'http://api.crossref.org/reverse';
  console.log(url);
  console.log(citations);
  var res = Meteor.http.call('POST', url, {data:citations});
  if ( res.statusCode === 200 ) {
    if ( res.data && res.data.message && res.data.message.DOI && res.data.message.score ) {
      var sc = res.data.message.score;
      var calculations = {citations:citations};
      if (sc > 20 && sc < 80) {
        calculations.boost = 1; // min boost
        var title = res.data.message.title[0].toLowerCase().replace(/[^a-z0-9 ]/g,'');
        var cites = citations.join(' ').toLowerCase().replace(/[^a-z0-9 ]/g,'');
        calculations.diff = cites.length - title.length; // could be negative, if we have less cite content than is in the title, in which case we don't want to give a high score anyway
        calculations.distance = CLapi.internals.tdm.levenshtein(title,cites).data.distance; // the smaller the better, but will also be larger if string length differs greatly
        var titletokens = title.split(' ');
        var citestokens = cites.split(' ');
        calculations.tokens = 0; // if a high degree of tokens from the title are found in the cite, it is more likely to be right
        calculations.titles = titletokens.length;
        calculations.cites = citestokens.length; // but if there are a lot more cite words than title words, it has more chance to be wrong again
        for ( var t in titletokens ) {
          if ( citestokens.indexOf(titletokens[t]) !== -1 ) calculations.tokens += 1;
        }
        // for an exact match, diff and distance will both be 0
        // greater distance should reduce boost, but reducing effect should be reduced by absolute value of diff
        // if diff is negative, the more negative it is the less cite content we have to go on, so the lower the boost should be
        // if diff is positive, there is more content for citestokens to match on, so finding titletokens should have less boost effect
        // tokens, titles, and cites will all have the same length
        // as tokens becomes less than titles, boost should go down
        // as cites increases compared to titles
        if (calculations.boost > 4) calculations.boost = 4; // max boost
        sc = sc * calculations.boost;
      }
      if ( sc > score ) {
        return { status: 'success', data: metadata ? res.data.message : {doi:res.data.message.DOI, title:res.data.message.title[0], score:res.data.message.score, adjusted: sc, calculations: calculations}, full:res.data}
      } else {
        return { status: 'success', data: {info: 'below score', required:score, received:res.data.message.score, adjusted: sc, calculations: calculations}, full:res.data}
      }
    } else {
      return { status: 'success', data: {info: 'not found'}, full:res.data}
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



