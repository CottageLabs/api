
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
      var res;
      try {
        res = CLapi.internals.use.europepmc.fulltextXML(this.urlParams.qry);
      } catch (err) {
        if(err.response.statusCode === 404) {
          console.log(this.urlParams.qry + ' not found when fetching EPMC full text XML.');
        } else {
          console.log('Error while fetching EPMC full text XML for ' + this.urlParams.qry + '. Most probably EPMC is temporarily down.');
        }
        return {statusCode: 404, body: {status: 'error', data: '404 not found' }}
      }

      return {status: 'success', data: res.data.resultList.result[0] }
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
  var res = CLapi.internals.use.europepmc.search('EXT_ID:' + ident + ' AND SRC:MED');
  if (res.total > 0) {
    return {status: 'success', data: res.data[0] }
  } else {
    return {status: 'success', data: res }    
  }
}

CLapi.internals.use.europepmc.pmc = function(ident) {
  var res = CLapi.internals.use.europepmc.search('PMCID:PMC' + ident.toLowerCase().replace('pmc',''));
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
  var res;
  try {
    res = Meteor.http.call('GET',url);
  } catch(err) {}// meteor http call get will throw error on 404
  var ret = {}
  if (res && res.data && res.data.hitCount) {
    ret.status = 'success';
    ret.total = res.data.hitCount; 
    ret.data = res.data && res.data.resultList ? res.data.resultList.result : []
  } else {
    ret.status = 'error';    
    ret.total = 0; 
    ret.data = [];
  }
  return ret;
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
  try {
    var res = Meteor.http.call('GET',url);
    return { status: 'success', total: res.data.hitCount, data: res.data.resultList.result}
  } catch(err) {
    return { status: 'error', total: 0, data: {}}    
  }// meteor http call get will throw error on 404
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
  try {
    var res = Meteor.http.call('GET',url);
    return { status: 'success', total: res.data.hitCount, data: res.data.resultList.result}
  } catch(err) {
    return { status: 'error', total: 0, data: {}}    
  }// meteor http call get will throw error on 404
}

CLapi.internals.use.europepmc.licence = function(pmcid,rec,fulltext) {
  var res;
  var maybe_licence;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (!fulltext && pmcid) {
      try {
        fulltext = CLapi.internals.use.europepmc.fulltextXML(pmcid);
      } catch (err) {
        // no need to log this failure to get the fulltext - simply try the HTML instead
      }
    }
    if (fulltext) {
      var licinperms = CLapi.internals.academic.licence(undefined,undefined,fulltext,'<permissions>','</permissions>');
      // console.log(pmcid + ' licinperms XML check: ' + licinperms);
      if (licinperms.licence && licinperms.licence !== 'unknown') {
        // console.log(pmcid + ' licinperms XML check success, found licence: ' + licinperms.licence);
        return {licence:licinperms.licence,source:'epmc_xml_permissions',
          matcher: licinperms.matcher ? licinperms.matcher : undefined,
          matched: licinperms.matched ? licinperms.matched : undefined
        }
      }
      // console.log(pmcid + ' licinperms XML check failed');

      var licanywhere = CLapi.internals.academic.licence(undefined,undefined,fulltext);
      // console.log(pmcid + ' licanywhere XML check' + licanywhere);
      if (licanywhere.licence && licanywhere.licence !== 'unknown') {
        // console.log(pmcid + ' licanywhere XML check success: ' + licanywhere.licence);
        return {licence:licanywhere.licence,source:'epmc_xml_outside_permissions',
          matcher: licanywhere.matcher ? licanywhere.matcher : undefined,
          matched: licanywhere.matched ? licanywhere.matched : undefined
        }
      }
      // console.log(pmcid + ' licanywhere XML check failed');

      if ( fulltext.indexOf('<permissions>') !== -1 ) {
        // console.log(pmcid + ' licinperms XML check discovered non-standard-licence');
        maybe_licence = {licence:'non-standard-licence',source:'epmc_xml_permissions'};
      }
    }

    // console.log(pmcid + ' no fulltext XML, trying EPMC HTML');
    if (pmcid) {
      var normalised_pmcid = 'PMC' + pmcid.toLowerCase().replace('pmc','');
      var licsplash = CLapi.internals.academic.licence('http://europepmc.org/articles/' + normalised_pmcid,false,undefined,undefined,undefined,true);
      // console.log(pmcid + ' licsplash HTML check on http://europepmc.org/articles/' + normalised_pmcid);
      // console.log(licsplash);
      if (licsplash.licence && licsplash.licence !== 'unknown') {
        // console.log(pmcid + ' licsplash HTML check success ' + licsplash.licence);
        return {licence:licsplash.licence,source:'epmc_html',
          matcher: licsplash.matcher ? licsplash.matcher : undefined,
          matched: licsplash.matched ? licsplash.matched : undefined
        }
      } else {
        // console.log(pmcid + ' licsplash HTML check failed');
      }
    }

    if (maybe_licence) { return maybe_licence }

    return false;
  }
}

CLapi.internals.use.europepmc.authorManuscript = function(pmcid,rec,fulltext) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (fulltext) {
      if (fulltext.indexOf('pub-id-type=\'manuscript\'') !== -1) {
        // console.log("First call for AAM XML");
        return 'Y_IN_EPMC_FULLTEXT';
      } else {
        return false;
      }
    }
    
    if ( pmcid ) {
      try {
        var ft = CLapi.internals.use.europepmc.fulltextXML(pmcid);
      } catch (err) {
        // no need to log this failure to get the fulltext - simply try the HTML then
      }

      if (ft && ft.indexOf('pub-id-type=\'manuscript\'') !== -1) {
        // console.log("Different call for AAM XML");
        return 'Y_IN_EPMC_FULLTEXT';
      } else {
        // console.log('AAM info not found in XML, trying HTML.')
        var url = 'http://europepmc.org/articles/PMC' + pmcid.toLowerCase().replace('pmc','');
        try {
          var pg = Meteor.http.call('GET',url);
          if (pg.statusCode === 200) {
            var page = pg.content;
            var s1 = 'Author Manuscript; Accepted for publication in peer reviewed journal';
            var s2 = 'Author manuscript; available in PMC';
            var s3 = 'logo-nihpa.gif';
            var s4 = 'logo-wtpa2.gif';
            if (page.indexOf(s1) !== -1 || page.indexOf(s2) !== -1 || page.indexOf(s3) !== -1 || page.indexOf(s4) !== -1) {
              return 'Y_IN_EPMC_SPLASHPAGE';
            } else {
              // console.log('AAM info not found in HTML');
              return false;
            }
          } else {
            return false;
          }
        } catch(err) {
          if(err.response.statusCode === 404) {
            return 'unknown-not-found-in-epmc'
          } else {
            return 'unknown-error-accessing-epmc';
          }
        }
      }
    } else {
      return 'unknown';
    }
  } else {
    return 'unknown';
  }
}

CLapi.internals.use.europepmc.fulltextXML = function(pmcid,rec) {
  // This function will raise an error if the HTTP GET returns an HTTP error like 404
  // When using it, make sure to put it in a try/catch block and take appropriate
  // action on error, like adding processing notes, logging and setting values to "unknown".
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0) rec = res.data[0];
  if (!pmcid) pmcid = rec.pmcid;
  if (pmcid) pmcid = pmcid.toLowerCase().replace('pmc','');
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/PMC' + pmcid + '/fullTextXML';
  var fulltext = false;
  var r = Meteor.http.call('GET',url);
  if (r.statusCode === 200) fulltext = r.content;
  return fulltext;
}

