
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
      var ft_envelope = CLapi.internals.use.europepmc.fulltextXML(this.urlParams.qry);
      if(ft_envelope.error) {
        if (ft_envelope.error == 404) {
          console.log(this.urlParams.qry + ' not found when fetching EPMC full text XML.');
          return {statusCode: 404, body: {status: 'error', data: '404 not found. Not found in EPMC.' }};
        } else {
          console.log('Error while fetching EPMC full text XML for ' + this.urlParams.qry + '. Most probably EPMC is temporarily down.');
          return {statusCode: 404, body: {status: 'error', data: '404 not found. Error when getting from EPMC.'}};
        }
      }
      this.response.writeHead(200, {
        'Content-type': 'application/xml',
        'Content-length': ft_envelope.fulltext.length
      });
      this.response.write(ft_envelope.fulltext);
      this.done();
      return {};
    }
  }
});

CLapi.addRoute('use/europepmc/pmc/:qry/licence', {
  get: {
    action: function() {
      return {status:'success', data:CLapi.internals.use.europepmc.licence(this.urlParams.qry)};
    }
  }
});

CLapi.addRoute('use/europepmc/pmc/:qry/aam', {
  get: {
    action: function() {
      return {status:'success', data:CLapi.internals.use.europepmc.authorManuscript(this.urlParams.qry)};
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
  // TODO epmc changed to using a cursormark for pagination, so change how we pass paging to them
  // see https://github.com/CottageLabs/LanternPM/issues/124
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

CLapi.internals.use.europepmc.licence = function(pmcid,rec,fulltext,noui) {
  var res;
  var maybe_licence;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  console.log(res)
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (!fulltext && pmcid) fulltext = CLapi.internals.use.europepmc.fulltextXML(pmcid).fulltext;
    if (fulltext) {
      var licinperms = CLapi.internals.academic.licence(undefined,undefined,fulltext,'<permissions>','</permissions>');
      console.log(pmcid + ' licinperms XML check: ' + licinperms);
      if (licinperms.licence && licinperms.licence !== 'unknown') {
        console.log(pmcid + ' licinperms XML check success, found licence: ' + licinperms.licence);
        return {licence:licinperms.licence,source:'epmc_xml_permissions',
          matcher: licinperms.matcher ? licinperms.matcher : undefined,
          matched: licinperms.matched ? licinperms.matched : undefined
        }
      }
      console.log(pmcid + ' licinperms XML check failed');

      var licanywhere = CLapi.internals.academic.licence(undefined,undefined,fulltext);
      console.log(pmcid + ' licanywhere XML check' + licanywhere);
      if (licanywhere.licence && licanywhere.licence !== 'unknown') {
        console.log(pmcid + ' licanywhere XML check success: ' + licanywhere.licence);
        return {licence:licanywhere.licence,source:'epmc_xml_outside_permissions',
          matcher: licanywhere.matcher ? licanywhere.matcher : undefined,
          matched: licanywhere.matched ? licanywhere.matched : undefined
        }
      }
      console.log(pmcid + ' licanywhere XML check failed');

      if ( fulltext.indexOf('<permissions>') !== -1 ) {
        console.log(pmcid + ' licinperms XML check discovered non-standard-licence');
        maybe_licence = {licence:'non-standard-licence',source:'epmc_xml_permissions'};
      }
    }

    if (pmcid && !noui) {
      console.log(pmcid + ' no fulltext XML, trying EPMC HTML');
      var normalised_pmcid = 'PMC' + pmcid.toLowerCase().replace('pmc','');
      //var licsplash = CLapi.internals.academic.licence('http://europepmc.org/articles/' + normalised_pmcid,false,undefined,undefined,undefined,true);
      var licsplash = CLapi.internals.limit.do(10000,CLapi.internals.academic.licence,"lantern_epmc_ui",['http://europepmc.org/articles/' + normalised_pmcid,false,undefined,undefined,undefined,true]);
      console.log(pmcid + ' licsplash HTML check on http://europepmc.org/articles/' + normalised_pmcid);
      // console.log(licsplash);
      if (licsplash.licence && licsplash.licence !== 'unknown') {
        console.log(pmcid + ' licsplash HTML check success ' + licsplash.licence);
        return {licence:licsplash.licence,source:'epmc_html',
          matcher: licsplash.matcher ? licsplash.matcher : undefined,
          matched: licsplash.matched ? licsplash.matched : undefined
        }
      } else {
        console.log(pmcid + ' licsplash HTML check failed');
      }
    }

    return maybe_licence !== undefined ? maybe_licence : false;
  } else {
    return false;
  }
}

CLapi.internals.use.europepmc.authorManuscript = function(pmcid,rec,fulltext,noui) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  var ft_arg_checked = false;
  if (res && res.total > 0 || rec || fulltext) {
    if (!rec) rec = res.data[0];
    if (!pmcid && rec) pmcid = rec.pmcid;
    if (fulltext) {
      if (fulltext.indexOf('pub-id-type=\'manuscript\'') !== -1 && fulltext.indexOf('pub-id-type="manuscript"') !== -1) {
        // console.log("First call for AAM XML");
        // ft_arg_checked = true;  // technically true but not necessary since we return
        return 'Y_IN_EPMC_FULLTEXT';
      } else {
        // so far AAM is false
        ft_arg_checked = true;  // but don't return yet - in case both pmcid and fulltext args are passed in, we should try using the pmcid next before deciding "false"
      }
    }
    
    if ( pmcid ) {
      var ft = CLapi.internals.use.europepmc.fulltextXML(pmcid).fulltext;

      if (ft && ft.indexOf('pub-id-type=\'manuscript\'') !== -1 && fulltext.indexOf('pub-id-type="manuscript"') !== -1) {
        // console.log("Different call for AAM XML");
        return 'Y_IN_EPMC_FULLTEXT';
      } else if (!noui) {
        // console.log('AAM info not found in XML, trying HTML.')
        var url = 'http://europepmc.org/articles/PMC' + pmcid.toLowerCase().replace('pmc','');
        try {
          //var pg = Meteor.http.call('GET',url);
          var pg = CLapi.internals.limit.do(10000,Meteor.http.call,"lantern_epmc_ui",['GET',url]);
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
            return 'unknown-not-found-in-epmc';
          } else {
            console.log(err.response);
            console.log(err.response.statusCode);
            CLapi.internals.mail.send({from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'epmc possible limit hit '+err.response.statusCode,content:JSON.stringify(err.response)});
            return 'unknown-error-accessing-epmc';
          }
        }
      } else {
        return 'unknown-and-epmc-ui-check-disabled';
      }
    } else {
      if (ft_arg_checked) return false;
      return 'unknown';
    }
  } else {
    if (ft_arg_checked) return false;
    return 'unknown';
  }
}

CLapi.internals.use.europepmc.fulltextXML = function(pmcid,rec) {
  var res;
  if (pmcid && !rec) res = CLapi.internals.use.europepmc.search('PMC' + pmcid.toLowerCase().replace('pmc',''));
  if (res && res.total > 0) rec = res.data[0];
  if (!pmcid) pmcid = rec.pmcid;
  if (pmcid) pmcid = pmcid.toLowerCase().replace('pmc','');
  var url = 'http://www.ebi.ac.uk/europepmc/webservices/rest/PMC' + pmcid + '/fullTextXML';
  var result = {fulltext: undefined, error: false};
  try {
    var r = Meteor.http.call('GET', url);
    if (r.statusCode === 200) result.fulltext = r.content;
  } catch(err) {
    result.error = err.response.statusCode;
  }
  return result;
}

