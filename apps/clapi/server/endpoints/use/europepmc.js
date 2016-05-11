
// Europe PMC client

// https://europepmc.org/RestfulWebService
// http://www.ebi.ac.uk/europepmc/webservices/rest/search/
// https://europepmc.org/Help#fieldsearch

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

CLapi.addRoute('use/europepmc/pmid/:qry', {
  get: {
    action: function() {
      var res = CLapi.internals.use.europepmc.pmid(this.urlParams.qry);
      try {
        return {status: 'success', data: res.data.resultList.result[0] }
      } catch(err) {
        return {status: 'success', data: res.data }        
      }
    }
  }
});

CLapi.addRoute('use/europepmc/pmc/:qry', {
  get: {
    action: function() {
      var res = CLapi.internals.use.europepmc.pmc(this.urlParams.qry);
      try {
        return {status: 'success', data: res.data.resultList.result[0] }
      } catch(err) {
        return {status: 'success', data: res.data }        
      }
    }
  }
});

CLapi.addRoute('use/europepmc/pmc/:qry/fulltext', {
  get: {
    action: function() {
      var res = CLapi.internals.use.europepmc.fulltextXML(this.urlParams.qry);
      if (res) {
        return {status: 'success', data: res.data.resultList.result[0] }
        this.response.writeHead(200, {
          'Content-type': 'application/xml',
          'Content-length': res.length
        });        
        this.response.write(res);
        this.done();
        return {};
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found' }}        
      }
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
      return CLapi.internals.use.europepmc.published(this.urlParams.startdate, undefined, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.addRoute('use/europepmc/published/:startdate/:enddate', {
  get: {
    action: function() {
      return CLapi.internals.use.europepmc.published(this.urlParams.startdate, this.urlParams.enddate, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.addRoute('use/europepmc/indexed/:startdate', {
  get: {
    action: function() {
      return CLapi.internals.use.europepmc.published(this.urlParams.startdate, undefined, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.addRoute('use/europepmc/indexed/:startdate/:enddate', {
  get: {
    action: function() {
      return CLapi.internals.use.europepmc.published(this.urlParams.startdate, this.urlParams.enddate, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.internals.use.europepmc = {};
CLapi.internals.use.europepmc.doi = function(doi) {
  var res = CLapi.internals.use.europepmc.search('DOI:' + doi);
  if (res.total > 0) {
    return {status: 'success', data: res.data[0] }
  } else {
    return {status: 'success', data: res }    
  }
}

CLapi.internals.use.europepmc.pmid = function(ident) {
  var res = CLapi.internals.use.europepmc.search(ident);
  if (res.total > 0) {
    return {status: 'success', data: res.data[0] }
  } else {
    return {status: 'success', data: res }    
  }
}

CLapi.internals.use.europepmc.pmc = function(ident) {
  var res = CLapi.internals.use.europepmc.search('PMC' + ident.toLowerCase().replace('pmc',''));
  if (res.total > 0) {
    return {status: 'success', data: res.data[0] }
  } else {
    return {status: 'success', data: res }    
  }
}

CLapi.internals.use.europepmc.search = function(qrystr,from,size) {
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' + qrystr + '&resulttype=core&format=json'
  if (size !== undefined) url += '&pageSize=' + size;
  if (from !== undefined) url += '&page=' + (Math.floor(from/size)+1);
  console.log(url);
  var res = Meteor.http.call('GET', url);
  return { status: 'success', total: res.data.hitCount, data: res.data && res.data.resultList ? res.data.resultList.result : []}
}

// http://dev.api.cottagelabs.com/use/europepmc/search/has_doi:n%20AND%20FIRST_PDATE:[2016-03-22%20TO%202016-03-22]
CLapi.internals.use.europepmc.published = function(startdate,enddate,from,size,qrystr) {
  if ( qrystr === undefined ) {
    qrystr = '';
  } else {
    qrystr = ' AND ';
  }
  if (enddate) {
    qrystr += 'FIRST_PDATE:[' + startdate + ' TO ' + enddate + ']';
  } else {
    qrystr += 'FIRST_PDATE:' + startdate;
  }
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' + qrystr + '&resulttype=core&format=json'
  if (size !== undefined) url += '&pageSize=' + size;
  if (from !== undefined) url += '&page=' + (Math.floor(from/size)+1);
  console.log(url);
  var res = Meteor.http.call('GET', url);
  return { status: 'success', total: res.data.hitCount, data: res.data.resultList.result}
}

CLapi.internals.use.europepmc.indexed = function(startdate,enddate,from,size,qrystr) {
  if ( qrystr === undefined ) {
    qrystr = '';
  } else {
    qrystr = ' AND ';
  }
  if (enddate) {
    qrystr += 'CREATION_DATE:[' + startdate + ' TO ' + enddate + ']';
  } else {
    qrystr += 'CREATION_DATE:' + startdate;
  }
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' + qrystr + '&resulttype=core&format=json'
  if (size !== undefined) url += '&pageSize=' + size;
  if (from !== undefined) url += '&page=' + (Math.floor(from/size)+1);
  console.log(url);
  var res = Meteor.http.call('GET', url);
  return { status: 'success', total: res.data.hitCount, data: res.data.resultList.result}
}

CLapi.internals.use.europepmc.licence = function(pmcid,rec,fulltext) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (rec.license) {
      return {licence:rec.license,source:'epmc_rest_api'}
    } else {
      if (!fulltext && pmcid) fulltext = CLapi.internals.use.europepmc.fulltextXML(pmcid);
      if (fulltext) {
        var licinperms = CLapi.internals.academic.licence(undefined,undefined,fulltext,'<permissions>','</permissions>');
        if (licinperms.licence && licinperms.licence !== 'unknown') {
          return {licence:licinperms.licence,source:'epmc_xml_permissions'}
        } else if ( fulltext.indexOf('<permissions>') !== -1 ) {
          return {licence:'non-standard-licence',source:'epmc_xml_permissions'} // TODO check with ET if this should get overwritten by subsequent finds
        } else {
          var licanywhere = CLapi.internals.academic.licence(undefined,undefined,fulltext);
          if (licanywhere.licence && licanywhere.licence !== 'unknown') {
            return {licence:licanywhere.licence,source:'epmc_xml_outside_permissions'}
          } else {
            if (pmcid) {
              var licsplash = CLapi.internals.academic.licence('http://europepmc.org/articles/PMC' + pmcid,false,undefined,undefined,undefined,true);
              if (licsplash.licence && licsplash.licence !== 'unknown') {
                return {licence:licsplash.licence,source:'epmc_html'}
              } else {
                return false;
              }
            } else {
              return false;
            }
          }
        }
      } else {
        return false;
      }
    }
  }
}

CLapi.internals.use.europepmc.authorManuscript = function(pmcid,rec,fulltext) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (rec.epmcAuthMan === 'Y') {
      // why isn't this good enough? http://europepmc.org/docs/EBI_Europe_PMC_Web_Service_Reference.pdf
      // eupmc API does not actually fully check if author manuscript or not. We still have to check the xml and splash page
      return 'Y_IN_EPMC_API';
    } else if (fulltext && fulltext.indexOf('pub-id-type=\'manuscript\'') !== -1) {
      return 'Y_IN_EPMC_FULLTEXT';
    } else if ( pmcid ) {
      var ft = CLapi.internals.use.europepmc.fulltextXML(pmcid);
      if (ft && ft.indexOf('pub-id-type=\'manuscript\'') !== -1) {
        return 'Y_IN_EPMC_FULLTEXT';
      } else {
        var url = 'http://europepmc.org/articles/PMC' + pmcid.toLowerCase().replace('pmc','');
        try {
          var pg = Meteor.http.call('GET',url);
          if (pg.statusCode === 200) {
            var page = pg.content;
            var s1 = 'Author Manuscript; Accepted for publication in peer reviewed journal';
            var s2 = 'Author manuscript; available in PMC';
            if (page.indexOf(s1) !== -1 || page.indexOf(s2) !== -1) {
              return 'Y_IN_EPMC_SPLASHPAGE';
            } else {
              return false;
            }
          } else {
            return false;
          }
        } catch(err) {
          return false;
        }
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}

CLapi.internals.use.europepmc.fulltextXML = function(pmcid,rec) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0) rec = res.data[0];
  if (!pmcid) pmcid = rec.pmcid;
  if (pmcid) pmcid = pmcid.toLowerCase().replace('pmc','');
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/PMC' + pmcid + '/fullTextXML';
  var fulltext = false;
  try {
    var r = Meteor.http.call('GET',url);
    if (r.statusCode === 200) fulltext = r.content;
  } catch(err) {}// meteor http call get will throw error on 404
  return fulltext;
}

