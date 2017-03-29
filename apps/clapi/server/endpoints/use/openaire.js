
// http://api.openaire.eu

CLapi.addRoute('use/openaire', {
  get: {
    action: function() {
      return {status: 'success', routes: routes, data: {info: 'returns responses from the openaire API.'} };
    }
  }
});

CLapi.addRoute('use/openaire/search', {
  get: {
    action: function() {
      return CLapi.internals.use.openaire.search(this.queryParams);
    }
  }
});

CLapi.addRoute('use/openaire/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.openaire.doi(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.open);
    }
  }
});



CLapi.internals.use.openaire = {};

CLapi.internals.use.openaire.doi = function(doi,open) {
  var res = CLapi.internals.use.openaire.search({doi:doi});
  if (res && res.data && typeof res.data !== 'string' && res.data.length > 0) {
    // TODO find one that actually has a doi we can find, and decide how to display the record for that doi
    var rec = !open || ( open && CLapi.internals.use.openaire.open(res.data[0]) ) ? res.data[0] : undefined;
    return {status: 'success', data: rec};
  } else {
    return {status: 'success'};
  }
}

// openaire has a datasets endpoint too, but there appears to be no way to 
// search it for datasets related to an article. Sometimes the users put 
// the article title partially or completely in the description along with 
// other info, but not always. So no good way to look for data related to an article yet

CLapi.internals.use.openaire.search = function(params) {
  var url = 'http://api.openaire.eu/search/publications?format=json&OA=true&';
  // allowed params are listed below
  if (params) {
    if (params.size === undefined) params.size = 10;
    for ( var op in params ) {
      // openaire uses page and size for paging whereas we default to ES from and size, 
      // so do a convenience coneversion of from
      if ( op === 'from') {
        var pg = 0; // openaire is page indexed from 1, but if there is no 1, we just don't give a page url
        if (params.size === 0) {
          pg = (params.from / 10) + 1;
        } else {
          pg = (params.from / params.size) + 1;
        }
        if (pg) url += 'page=' + params.from/ + '&';
      } else {
        url += op + '=' + params[op] + '&';
      }
    }
  }
  console.log('searching openaire for ' + url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      var results = [];
      try {
        results = res.data.response.header.total.$ === 1 ? [res.data.response.results.result] : res.data.response.results.result;
      } catch (err) {}
      return { status: 'success', data: results, total: res.data.response.header.total.$}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: 'openaire API error'}
  }

}

CLapi.internals.use.openaire.open = function(rec) {
  var open = false;
  if (rec.metadata && rec.metadata['oaf:result'] && rec.metadata['oaf:result'].bestlicense && rec.metadata['oaf:result'].bestlicense['@classid'] === 'OPEN' && rec.metadata['oaf:result'].children && rec.metadata['oaf:result'].children.instance && rec.metadata['oaf:result'].children.instance.length > 0 ) {
    for ( var o in rec.metadata['oaf:result'].children.instance ) {
      var i = rec.metadata['oaf:result'].children.instance[o];
      if (i.licence && i.licence['@classid'] === 'OPEN' && i.webresource && i.webresource.url && i.webresource.url.$ && !CLapi.internals.service.oab.blacklist(i.webresource.url.$) ) {
        open = i.webresource.url.$;
        break;
      }
    }
  }
  return open;
}

/*

sortBy
Select the sorting order: sortBy=field,[ascending|descending]

where field is one of: dateofcollection, resultstoragedate, resultstoragedate, resultembargoenddate, resultembargoendyear, resultdateofacceptance, resultacceptanceyear

doi
Gets the publications with the given DOIs, if any. Allowed values: comma separated list of DOIs. Alternatevely, it is possible to repeat the paramater for each requested doi.

openairePublicationID
Gets the publication with the given openaire identifier, if any. Allowed values: comma separated list of openaire identifiers. Alternatevely, it is possible to repeat the paramater for each requested identifier.

fromDateAccepted
Gets the publications whose date of acceptance is greater than or equal the given date. Allowed values: date formatted as YYYY-MM-DD.

toDateAccepted
Gets the publications whose date of acceptance is less than or equal the given date. Allowed values: date formatted as YYYY-MM-DD.

title
Gets the publications whose titles contain the given list of keywords. Allowed values: white-space separated list of keywords.

author
Search for publications by authors. Allowed value is a white-space separated list of names and/or surnames.

openaireAuthorID
Search for publications by openaire author identifier. Allowed values: comma separated list of identifiers. Alternatevely, it is possible to repeat the paramater for each author id. In both cases, author identifiers will form a query with OR semantics.

openaireProviderID
Search for publications by openaire data provider identifier. Allowed values: comma separated list of identifiers. Alternatevely, it is possible to repeat the paramater for each provider id. In both cases, provider identifiers will form a query with OR semantics.

openaireProjectID
Search for publications by openaire project identifier. Allowed values: comma separated list of identifiers. Alternatevely, it is possible to repeat the paramater for each provider id. In both cases, provider identifiers will form a query with OR semantics.

hasProject
Allowed values: true|false. If hasProject is true gets the publications that have a link to a project. If hasProject is false gets the publications with no links to projects.

projectID
Search for publications associated to a project with the given grant identifier.

FP7ProjectID
Search for publications associated to a FP7 project with the given grant number. It is equivalent to a query by funder=FP7&projectID=grantID

OA
Allowed values: true|false. If OA is true gets Open Access publications. If OA is false gets the non Open Access publications
*/
