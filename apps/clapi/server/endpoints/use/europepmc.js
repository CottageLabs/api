
// Europe PMC client

// https://europepmc.org/RestfulWebService
// http://www.ebi.ac.uk/europepmc/webservices/rest/search/
// https://europepmc.org/Help#fieldsearch

// getpapers eupmc api client:
// https://github.com/ContentMine/getpapers/blob/master/lib/eupmc.js

// GET http://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1007/bf00197367&resulttype=core&format=json
// default page is 1 and default pageSize is 25
// resulttype lite is smaller, lacks so much metadata, no mesh, terms, etc
// open_access:y added to query will return only open access articles, and they will have fulltext xml available at a link like the following:
// http://www.ebi.ac.uk/europepmc/webservices/rest/PMC3257301/fullTextXML
// can also use HAS_PDF:y to get back ones where we should expect to be able to get a pdf, but it is not clear if those are OA and available via eupmc
// can ensure a DOI is available using HAS_DOI
// can search publication date via FIRST_PDATE:1995-02-01 or FIRST_PDATE:[2000-10-14 TO 2010-11-15] to get range


CLapi.addRoute('use/europepmc', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi.internals.use.europepmc ) routes.push(k);
      return {status: 'success', routes: routes, data: {info: 'returns a subset of the Europe PMC API functionality'} };
    }
  }
});

CLapi.addRoute('use/europepmc/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.europepmc.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.addRoute('use/europepmc/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.europepmc.search(this.urlParams.qry, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.addRoute('use/europepmc/published/:startdate', {
  get: {
    action: function() {
      return {};
    }
  }
});

CLapi.addRoute('use/europepmc/published/:startdate/:enddate', {
  get: {
    action: function() {
      return {};
    }
  }
});

CLapi.internals.use.europepmc = {};
CLapi.internals.use.europepmc.doi = function(doi) {
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:' + doi + '&resulttype=core&format=json'
  console.log(url);
  var res = Meteor.http.call('GET', url);
  if ( res.hitCount !== 0 ) {
    return { status: 'success', data: res.data.resultList.result[0]}    
  } else {
    return { status: 'success', data: res.data}      
  }
}

CLapi.internals.use.europepmc.search = function(qrystr,from,size) {
  
}




