
// resolve an ID to an open URL, and redirect to it if desired

academic_resolved = new Mongo.Collection("academic_resolved");

CLapi.addRoute('academic/undirect', {
  get: {
    action: function() {
      return {status:'success', data: CLapi.internals.academic.undirect(this.queryParams.url) };
    }
  }
});

/*CLapi.addRoute('academic/phantom', {
  get: {
    action: function() {
      var format = this.queryParams.format ? this.queryParams.format : 'plain';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/' + format
        },
        body: CLapi.internals.phantom.get(this.queryParams.url,this.queryParams.delay)
      };
    }
  }
});*/

CLapi.addRoute('academic/resolve', {
  get: {
    action: function() {
      var ident = this.queryParams.doi;
      if ( this.queryParams.url ) ident = this.queryParams.url;
      if ( this.queryParams.pmid ) ident = 'pmid' + this.queryParams.pmid;
      if ( this.queryParams.pmc ) ident = 'pmc' + this.queryParams.pmc.toLowerCase().replace('pmc','');
      if ( this.queryParams.title ) ident = 'TITLE:' + this.queryParams.title;
      if ( this.queryParams.citation ) ident = 'CITATION:' + this.queryParams.citation;
      if ( ident ) {
        return CLapi.internals.academic.resolve(ident,undefined,undefined,this.queryParams.refresh);
      } else {
        return {status: 'success', data: {info: 'Searches for data about an article ID and attempts to return a set of useful open access URLs. \
          This is like dx.doi.org, the DOI resolver, although this route is just the access to the JSON metadata about the URLs we can find. \
          Also it actually accepts DOI, PMID, or PMC ID, and will even try with just a URL to see if any of the accepted \
          IDs can be found there to work with. If you want to actually be redirected instead of getting the data, use the "redirect" route \
          instead of this "resolve" route. \
          Just use the query params on this URL of doi= or pmid= or pmc= or url='} };
      }
    }
  }
});
CLapi.addRoute('academic/redirect', {
  get: function() {
    var ident = this.queryParams.doi;
    if ( this.queryParams.url ) ident = this.queryParams.url;
    if ( this.queryParams.pmid ) ident = 'pmid' + this.queryParams.pmid;
    if ( this.queryParams.pmc ) ident = 'pmc' + this.queryParams.pmc;
    if ( ident ) {
      return CLapi.internals.academic.redirect(ident,this.queryParams.refresh);
    } else {
      return {status: 'success', data: {info: 'Resolves an ID to an open access URL and redirects to it. Like dx.doi.org, the DOI resolver. \
        But actually accepts DOI, PMID, or PMC ID, or even tries with just being given a URL in which case it looks for \
        any of the useful IDs on the page the URL points to. If an OA URL cannot be found this route \
        will return a 404 and the JSON object of the URLs that we could actually find. If you want direct access to that JSON object, \
        then use the "resolve" route instead of the "redirect" route and it will be delivered to you as JSON with no redirect or 404. The \
        default preferred format to redirect to is html then pdf then xml, but can be set to "prefer=xml" or "prefer=pdf" as a query parameter \
        Just use the query params on this URL of doi= or pmid= or pmc= or url='} };
    }
  }
});
CLapi.addRoute('academic/redirect/:pmorpmc', {
  get: function() {
    if (this.urlParams.pmorpmc.toLowerCase().indexOf('pm') === 0) {
      return CLapi.internals.academic.redirect(this.urlParams.pmorpmc,this.queryParams.refresh);
    } else {
      return { statusCode: 404, body: {status: 'error', 'data': '404 not found'} }
    }
  }
});
CLapi.addRoute('academic/redirect/pmid/:pmid', {
  get: function() {
    return CLapi.internals.academic.redirect(this.urlParams.pmid,this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/redirect/pmc/:pmc', {
  get: function() {
    return CLapi.internals.academic.redirect('PMC' + this.urlParams.pmc.toLowerCase().replace('pmc',''),this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/redirect/:doipre/:doipost', {
  get: function() {
    return CLapi.internals.academic.redirect(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/redirect/doi/:doipre/:doipost', {
  get: function() {
    return CLapi.internals.academic.redirect(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/redirect/citation/:citation', {
  get: function() {
    return CLapi.internals.academic.redirect('CITATION:' + this.urlParams.citation,this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/redirect/title/:title', {
  get: function() {
    return CLapi.internals.academic.redirect('CITATION:' + this.urlParams.title,this.queryParams.refresh);
  }
});

/*CLapi.addRoute('academic/resolved/:rid', {
  post: function() { // should become a way with authentication for other systems to update the resolvers object, like oabutton
  },
  delete: function() {
    action: {
      var res = academic_resolved.findOne(this.urlParams.rid);
      if (res) {
        academic_resolved.remove(this.urlParams.rid);
        return {status: 'success'}
      } else {
        return {
          statusCode: 404,
          body: {status: 'error', 'data': '404 not found'}
        }
      }
    }
  }
});*/

// TODO add a route to receive notifications that the URL we returned was not open
// which should also provide a way for someone to inform us of an alternate that is open
// in which case they must authenticate themselves to confirm they are a worthy source of such alternate information
// can be as simple as them signing up with an account and confirming their email so we know who they are and that they are real
// then we can record who told us of the alternate URL and save it wherever we are saving all this url redirect info



CLapi.internals.academic.redirect = function(ident,refresh) {
  var possibles = CLapi.internals.academic.resolve(ident,undefined,undefined,refresh);
  if ( possibles.url ) {
    console.log('resolved ' + ident + ' and redirecting to ' + possibles.url);
    return {
      statusCode: 302,
      headers: {
        'Content-Type': 'text/plain',
        'Location': possibles.url
      },
      body: 'Location: ' + possibles.url
    };
  } else {
    console.log('resolving failed, returning JSON metadata and 404');
    /*return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: possibles
    };*/
    return {
      statusCode: 302,
      headers: {
        'Content-Type': 'text/plain',
        'Location': 'https://openaccessbutton.org/find?url='+ident
      },
      body: 'Location: ' + 'https://openaccessbutton.org/find?url='+ident
    };
  }
}

CLapi.internals.academic.resolve = function(ident,content,meta,refresh) {
  // Resolve a URL or an ID to the best guess open alternative. Could be DOI, PMID, PMC... for now
  console.log('starting academic resolve for ' + ident);
  var ret = {url:false,original:ident};

  // TODO should a check be added for fulltext url?
  // <meta name="citation_fulltext_html_url" content="" />
  // and if found, is that really the url we want, and is it the current page content or not?
  // if not, worth rendering another phantom call?
  
  // should start with check of academic_resolved or catalogue or wherever being stored,
  // and re-use unless refresh is true (or some number of past days)
  var exists;
  
  var res;  
  var type = 'url';
  if (ident && ( ident.toLowerCase().indexOf('pmc/') === 0 || ident.toLowerCase().indexOf('pmid/') === 0 ) ) ident = ident.replace('/',''); // cx.ctg.li passes idents of form pmc/1234567
  if (!ident && content) {
    // no problem, content will be used at first check
  } else if ( ident.indexOf('TITLE:') === 0) {
    // can pass titles explicitly, or may next guess them from what appears to be a citation string
    ident = ident.replace('TITLE:','');
    ret.title = ident;
    type = 'title';
  } else if ( ident.indexOf('CITATION:') === 0 || ( ident.length > 15 && ident.indexOf(' ') !== -1 && ident.split(' ').length > 2 ) ) {
    // the url route passthrough above prefixes the ident value with CITATION:, if the citation query param was passed in, for convenience
    // otherwise if it appears to be a string with at least two spaces in it (and therefore three words) then assume it is a citation of some sort
    // in which case we will try to reverse match it to a DOI via crossref
    ident = ident.replace('CITATION:','');
    type = 'citation';
  } else if (ident.toLowerCase().indexOf('pubmed/') !== -1) {
    ident = ident.substring((ident.indexOf('pubmed/')+7)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmid';
  } else if ( ident.indexOf('pubmedid=') !== -1 ) {
    ident = ident.substring((ident.indexOf('pubmedid=')+9)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmid';
  } else if ( ident.indexOf('/pmc') !== -1 ) {
    ident = ident.substring((ident.indexOf('/pmc')+4)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmc';
  } else if ( ident.toLowerCase().indexOf('pmc') === 0 ) {
    ident = ident.toLowerCase().replace('pmc','');
    type = 'pmc';
  } else if (ident.indexOf('10.') === 0 || ident.indexOf('doi.org') !== -1) {
    if (ident.indexOf('10.') !== 0) ident = '10.' + ident.split('10.')[1];
    type = 'doi';
  } else if ( ident.toLowerCase().replace('pmid','').length <= 8 && !isNaN(parseInt(ident.toLowerCase().replace('pmid',''))) ) {
    ident = ident.toLowerCase().replace('pmid','');
    type = 'pmid';
  }

  if (type === 'citation' || type === 'title') {
    console.log('academic resolve looking up crossref for ' + type);
    console.log(ident);
    var check = CLapi.internals.use.crossref.reverse(ident);
    if (check.data && check.data.doi) {
      type = 'doi';
      ident = check.data.doi;
      ret.doi = ident;
      ret.title = check.data.title;
      try { ret.journal = check.data['container-title'][0]; } catch(err) {}
      ret.source = 'crossref'; // source for doi, will be updated to source for full content if found later
    } else if (ident.indexOf('title') !== -1) {
      // if someone dumped a cite of various formats (marc, bibtex, etc), try to extract just a title from it
      ident = ident.trim();
      if (ident.indexOf('{') === 0 || ident.indexOf('[') === 0) {
        try {
          var ji = JSON.parse(ident);
          if (ident.indexOf('[') === 0) {
            try {
              for ( var i in ji ) {
                if (ji[i].title) {
                  ident = ji[i].title;
                  ret.title = ident;
                  ret.type = 'title';
                }
              }
            } catch(err) {}
          } else if (ji.title) {
            ident = ji.title;
            ret.title = ident;
            ret.type = 'title';            
          }
        } catch(err) {}
      }
      if (!ret.title) {
        ident = ident.split('title')[1].trim();
        var ti;
        if (ident.indexOf('|') !== -1) {
          ti = ident.split('|')[0].trim();
        } else if (ident.indexOf('}') !== -1) {
          ti = ident.split('}')[0].trim();
        } else if (ident.indexOf('"') !== -1 || ident.indexOf('"') !== -1) {
          var w;
          var p = 0;
          if ( ident.indexOf('"') !== -1) {
            w = '"';
            p = ident.indexOf('"');
          }
          if ( ident.indexOf("'") !== -1 && ident.indexOf("'") < p) w = "'";
          var parts = ident.split(w);
          for ( var pp in parts ) {
            var tp = parts[pp].toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9]/g,' ').trim();
            if (tp.length > 5) ti = tp;
          }
        }
        if (ti) {
          ident = ti.replace(/(<([^>]+)>)/g,'').trim();
          ret.title = ident;
          ret.type = 'title';
        }
        if (ret.title) {
          var c2 = CLapi.internals.use.crossref.reverse(ident);
          if (c2.data && c2.data.doi) {
            type = 'doi';
            ident = c2.data.doi;
            ret.doi = ident;
            ret.title = c2.data.title;
            try { ret.journal = c2.data['container-title'][0]; } catch(err) {}
            ret.source = 'crossref'; // source for doi, will be updated to source for full content if found later
          }
        }
      }
    } else {
      // try it as just a title
      ret.title = ident;
      ret.type = 'title';
      var c3 = CLapi.internals.use.crossref.reverse(ident);
      if (c3.data && c3.data.doi) {
        type = 'doi';
        ident = c3.data.doi;
        ret.doi = ident;
        ret.title = c3.data.title;
        try { ret.journal = c3.data['container-title'][0]; } catch(err) {}
        ret.source = 'crossref'; // source for doi, will be updated to source for full content if found later
      }
    }
  }
  
  if (type === 'url') {
    var oabr = oab_request.findOne({type:'article',url:ident,status:'received',received:{$exists:true}});
    if (oabr) {
      console.log('academic resolve found in oabutton by url');
      ret.source = 'oabutton';
      ret.title = oabr.title;
      ret.journal = oabr.journal;
      if (oabr.received.url) {
        ret.url = oabr.received.url
      } else if (oabr.received.zenodo) {
        ret.url = oabr.received.zenodo;
        ret.in = 'zenodo';
      } else if (oabr.received.osf) {
        ret.url = oabr.received.osf;
        ret.in = 'osf';
      }
    } else {
      console.log('academic resolve processing for URL')
      // is it worth doing a licence check on a URL? - if open, this is the URL (if there is a URL - could be content)
      // else we look for DOIs PMIDs PMC IDs in the page content
      if (!content) content = CLapi.internals.phantom.get(ident,undefined);
      if (meta === undefined) meta = CLapi.internals.academic.catalogue.extract(ident,content);
      if (meta.title) ret.title = meta.title;
      if (meta.journal) ret.journal = meta.journal;
      if (meta.doi) {
        type = 'doi';
        ident = meta.doi;
        ret.doi = ident;
        ret.source = 'URL'; // source for doi, will be updated to source for full content if found later
      }
      if (meta.pmc) {
        type = 'pmc';
        ident = meta.pmc;
        ret.pmc = ident;
        ret.source = 'URL'; // source for doi, will be updated to source for full content if found later
      }
      if (meta.pmid) {
        type = 'pmid';
        ident = meta.pmid;
        ret.pmid = ident;
        ret.source = 'URL'; // source for doi, will be updated to source for full content if found later
      }
    }
  }

  // with a pmid or pmcid look up on eupmc
  if (type === 'pmid' || type === 'pmc') {
    var pident = type === 'pmid' ? 'https://www.ncbi.nlm.nih.gov/pubmed/' + ident : 'http://europepmc.org/articles/PMC' + ident.toLowerCase().replace('pmc','');
    var oabpmr = oab_request.findOne({type:'article',url:pident,status:'received',received:{$exists:true}});
    if (oabpmr) {
      console.log('academic resolve found in oabutton by pmid/pmcid');
      ret.source = 'oabutton';
      ret.title = oabpmr.title;
      ret.journal = oabpmr.journal;
      if (oabpmr.received.url) {
        ret.url = oabpmr.received.url
      } else if (oabpmr.received.zenodo) {
        ret.url = oabpmr.received.zenodo;
        ret.in = 'zenodo';
      } else if (oabpmr.received.osf) {
        ret.url = oabpmr.received.osf;
        ret.in = 'osf';
      }
    }
    if (!ret.url) {
      console.log('academic resolve processing for PMC/PMID')
      ret[type] = ident;
      res = CLapi.internals.use.europepmc[type](ident);
      if (res.data.doi) ret.doi = res.data.doi;
      if (res.data.title) ret.title = res.data.title;
      if (res.data.journalInfo && res.data.journal && res.data.journal.title) ret.journal = res.data.journal.title.split('(')[0].trim();
      if ( res.data.fullTextUrlList && res.data.fullTextUrlList.fullTextUrl ) {
        for ( var ei in res.data.fullTextUrlList.fullTextUrl ) {
          var erl = res.data.fullTextUrlList.fullTextUrl[ei];
          if ( erl.availabilityCode.toLowerCase() === 'oa' && erl.documentStyle.toLowerCase() === 'html') {
            ret.source = 'EUPMC';
            ret.url = erl.url;
          }
        }
      }
      if (!ret.url && res.data.doi) {
        ident = res.data.doi;
        ret.source = 'EUPMC'; // source for doi, will be updated to source for full content if found later
        ret.doi = ident;
        type = 'doi';
      }
    }
  }

  if (!ret.url && type === 'doi') {
    console.log('academic resolve processing for DOI')
    ret.doi = ident;
    // no use looking up the DOI in crossref yet because that does not indicate openness of the URLs
    try { // check oabutton
      var dident = 'https://doi.org/' + ident;
      var oabdr = oab_request.findOne({type:'article',url:dident,status:'received',received:{$exists:true}});
      if (oabdr) {
        console.log('academic resolve found in oabutton by doi');
        ret.source = 'oabutton';
        ret.title = oabdr.title;
        ret.journal = oabdr.journal;
        if (oabdr.received.url) {
          ret.url = oabdr.received.url
        } else if (oabdr.received.zenodo) {
          ret.url = oabdr.received.zenodo;
          ret.in = 'zenodo';
        } else if (oabdr.received.osf) {
          ret.url = oabdr.received.osf;
          ret.in = 'osf';
        }
      }
    } catch(err) {}
    if (!ret.url) { // check eupmc
      try {
        res = CLapi.internals.use.europepmc[type](ident);
        if (res.data.title && !ret.title) ret.title = res.data.title;
        if ( res.data.fullTextUrlList && res.data.fullTextUrlList.fullTextUrl ) {
          for ( var oi in res.data.fullTextUrlList.fullTextUrl ) {
            var orl = res.data.fullTextUrlList.fullTextUrl[oi];
            if ( orl.availabilityCode.toLowerCase() === 'oa' && orl.documentStyle.toLowerCase() === 'html') {
              ret.source = 'EUPMC';
              ret.url = orl.url;
            }
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try { // check share
        res = CLapi.internals.use.share.doi(ident);
        if (res.data) {
          var ourl = CLapi.internals.use.share.open(res.data);
          if (ourl) {
            ret.url = ourl;
            ret.source = 'share'
          }
          if (!ret.title) ret.title = res.data.title;
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try { // check oadoi
        res = CLapi.internals.use.oadoi.doi(ident);
        if (res.data && res.data.evidence !== "closed") {
          ret.url = res.data.free_fulltext_url ? res.data.free_fulltext_url : res.data.url;
          ret.title = res.data.dctitle;
          ret.source = 'oadoi';
          ret.licence = res.data.license; // are these two useful, to save use looking up?
          ret.color = res.data.oa_color;
        }
        if (ret.url) {
          var bl = CLapi.internals.service.oab.blacklist(ret.url,true);
          if (bl && bl !== true) {
            ret.url = bl;
          } else if (bl) {
            ret.blacklist = ret.url;
            ret.url = undefined;          
          }
        }
      } catch(err) {}
    }
    /*if (!ret.url) {
      // Dissemin sometimes returns things it says it found in BASE even though we cannot find them in BASE
      // but search BASE first anyway, as often we do find things there, then go on to Dissemin
      try { // check BASE
        res = CLapi.internals.use.base.doi(ident);
        if (res.data && res.data.dclink) {
          ret.url = res.data.dclink;
          ret.title = res.data.dctitle;
          ret.source = 'BASE';
        }
        if (ret.url) {
          var bl = CLapi.internals.service.oab.blacklist(ret.url,true);
          if (bl && bl !== true) {
            ret.url = bl;
          } else if (bl) {
            ret.blacklist = ret.url;
            ret.url = undefined;          
          }
        }
      } catch(err) {}
    }*/
    /*if (!ret.url) { // check dissemin - it does return more things than just what is in BASE, and sometimes finds things there we can't, for unknown reason
      try {
        res = CLapi.internals.use.dissemin.doi(ident);
        if (res.data.pdf_url && res.data.pdf_url.toLowerCase().indexOf('researchgate') === -1) {
          // TODO Dissemin will return records that are to "open" repos, but without a pdf url 
          // they could just be repos with biblio records. Should we include those too, or not?
          ret.source = "Dissemin";
          ret.title = res.data.title;
          ret.url = res.data.pdf_url;
        }
      } catch(err) {}
    }*/
    if (!ret.url) {
      try {
        res = CLapi.internals.use.core.articles.doi(ident);
        if (res.data.fulltextIdentifier) {
          ret.url = res.data.fulltextIdentifier;
          ret.source = "CORE";
        }
        if (!ret.url && res.data.fulltextUrls && res.data.fulltextUrls.length > 0) {
          var uu;
          for ( var u in res.data.fulltextUrls ) {
            var tu = res.data.fulltextUrls[u];
            if ( tu.indexOf('dx.doi.org') === -1 && tu.indexOf('core.ac.uk') === -1 && (uu === undefined || ( uu.indexOf('.pdf') === -1 && tu.indexOf('.pdf') !== -1 ) ) ) {
              var bl = CLapi.internals.service.oab.blacklist(tu,true);
              if (bl && bl !== true) {
                uu = bl;
              } else if (bl) {
                ret.blacklist = tu;
              } else {
                uu = tu;
              }
            }
          }
          if (uu !== undefined) {
            ret.url = uu;
            ret.title = res.data.title;
            ret.source = "CORE";
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try {
        res = CLapi.internals.use.openaire.doi(ident);
        if (res.data) {
          var oaurl = CLapi.internals.use.openaire.open(res.data);
          if (oaurl) {
            ret.url = oaurl;
            ret.source = 'openaire'
          }
          if (!ret.title && res.data && res.data.metadata && res.data.metadata['oaf:result'] && res.data.metadata['oaf:result'].title && res.data.metadata['oaf:result'].title.$) ret.title = res.data.metadata['oaf:result'].title.$;
        }
      } catch(err) {}
    }
    if (!ret.url) { // check figshare
      try {
        res = CLapi.internals.use.figshare.doi(ident);
        if (res.data && res.data.doi === ident) {
          if (res.data.url_public_html) {
            ret.source = "figshare";
            ret.url = res.data.url_public_html;
          }
          if (!ret.title) ret.title = res.data.title;
        }
      } catch(err) {}
    }
    if (!ret.url) {
      // check doaj
      res = CLapi.internals.use.doaj.articles.doi(ident);
      if (res.data && res.data.bibjson && res.data.bibjson.identifier) {
        for ( var b in res.data.bibjson.identifier ) {
          if ( res.data.bibjson.identifier[b].type === 'doi' && res.data.bibjson.identifier[b].id === ident ) {
            ret.source = "DOAJ";
            ret.title = res.data.bibjson.title;
            for ( var l in res.data.bibjson.link ) {
              if (!ret.url || res.data.bibjson.link[l].type === 'fulltext') ret.url = res.data.bibsjon.link[l].url;
            }
            break;
          }
        }
      }
    }
    // add other places to check with DOI here, until one of them sets ret to be a value
  }
  if (ret.type === 'doi' && !ret.doi) ret.doi = ident;
    
  // now if type is doi but we still have no url, and still have no title, get meta from crossref
  if (!ret.title && type === 'doi') {
    try {
      res = CLapi.internals.use.crossref.works.doi(ident);
      if (res.data && res.data.DOI === ident && res.data.title) {
        ret.title = res.data.title[0].toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9 ]/g,' ');
      }
    } catch(err) {}    
  }

  // if things could not be found by identifiers, which is the best way, then search by titles
  if (!ret.url && ret.title) {
    try { // check oabutton
      var oabtr = oab_request.findOne({type:'article',url:ret.title,status:'received',received:{$exists:true}});
      if (oabtr) {
        console.log('academic resolve found in oabutton by title/citation');
        ret.source = 'oabutton';
        if (oabtr.received.url) {
          ret.url = oabtr.received.url
        } else if (oabtr.received.zenodo) {
          ret.url = oabtr.received.zenodo;
          ret.in = 'zenodo';
        } else if (oabtr.received.osf) {
          ret.url = oabtr.received.osf;
          ret.in = 'osf';
        }
      }
    } catch(err) {}
    // check EUPMC
    if (!ret.url) {
      try {
        res = CLapi.internals.use.europepmc.search('title:"'+ret.title+'"');
        if (res.total > 0) {
          res = res.data[0];
          if ( res.fullTextUrlList && res.fullTextUrlList.fullTextUrl ) {
            for ( var ni in res.fullTextUrlList.fullTextUrl ) {
              var irl = res.fullTextUrlList.fullTextUrl[ni];
              if ( irl.availabilityCode.toLowerCase() === 'oa' && irl.documentStyle.toLowerCase() === 'html') {
                ret.source = 'EUPMC';
                ret.url = irl.url;
                if (res.doi && !ret.doi) ret.doi = res.data.doi;
              }
            }
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try { // check share
        res = CLapi.internals.use.share.search(ident);
        if (res.data && res.data.length > 0) {
          var tourl = CLapi.internals.use.share.open(res.data[0]);
          if (tourl) {
            ret.url = tourl;
            ret.source = 'share'
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try {
        ret.title = ret.title.toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9 ]/g,' ');
        // check BASE
        res = CLapi.internals.use.base.search('dctitle:"'+ret.title.toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9 ]/g,' ')+'"');
        if (res && res.data && res.data.docs && res.data.docs.length > 0) {
          res = res.data.docs[0];
          if (res.dclink && res.dctitle.toLowerCase().replace(/[^a-z0-9 ]/g,' ') === ret.title.toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9 ]/g,' ') ) {
            // is it worth getting the DOI from here, if present and if not yet known?
            if (res.dclink.toLowerCase().indexOf('pmc') !== -1 && res.dclink.toLowerCase().split('/').pop() === 'pmc') {
              // add a check for BASE having wrong PMC links, sometimes possible, according to http://blog.impactstory.org/dirty-data/
              // any way to find it otherwise here?
            } else {
              ret.url = res.dclink;
              ret.title = res.dctitle;
              ret.source = 'BASE';
            }
          }
        }
        if (ret.url) {
          var bl = CLapi.internals.service.oab.blacklist(ret.url,true);
          if (bl && bl !== true) {
            ret.url = bl;
          } else if (bl) {
            ret.blacklist = ret.url;
            ret.url = undefined;          
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      try {
        res = CLapi.internals.use.openaire.search({title:ident});
        if (res.data && res.data.length > 0) {
          var opurl = CLapi.internals.use.openaire.open(res.data[0]);
          if (opurl) {
            ret.url = opurl;
            ret.source = 'openaire'
          }
        }
      } catch(err) {}
    }
    if (!ret.url) {
      // check CORE
      try {
        res = CLapi.internals.use.core.articles.search('title:"' + ret.title + '"');
        if ( res.statusCode === 200 && res.data && res.data.totalHits > 0 ) {
          var rb = res.data.data[0];
          for ( var nb in res.data.data ) {
            if ( res.data.data[nb].hasFullText === "true" ) { // should we even bother linking to anything that does not have full text?
              rb = res.data.data[nb];
              break;
            }
          }
          if (rb.fulltextIdentifier) {
            ret.title = rb.title;
            ret.url = rb.fulltextIdentifier;
            ret.source = "CORE";
          }
          if (!ret.url && rb.fulltextUrls && rb.fulltextUrls.length > 0) {
            var cu;
            for ( var c in rb.fulltextUrls ) {
              var ou = rb.fulltextUrls[c];
              if ( ou.indexOf('dx.doi.org') === -1 && ou.indexOf('core.ac.uk') === -1 && (cu === undefined || ( cu.indexOf('.pdf') === -1 && cu.indexOf('.pdf') !== -1 ) ) ) {
                var bl =  CLapi.internals.service.oab.blacklist(ou,true);
                if (bl && bl !== true) {
                  cu = bl;
                } else if (bl) {
                  ret.blacklist = ou;
                } else {
                  cu = ou;                
                }
              }
            }
            if (cu !== undefined) {
              ret.url = cu;
              ret.title = rb.title;
              ret.source = "CORE";
            }
          }
        }
      } catch (err) {}
    }
    /*if (!ret.url) { // check figshare
      try {
        res = CLapi.internals.use.figshare.search({'search_for':'"' + ret.title + '"'});
        if (res.data && res.data.length > 0) {
          if (res.data[0].url_public_html) {
            ret.source = "figshare";
            ret.url = res.data[0].url_public_html;
          }
        }
      } catch(err) {}
    }*/
    if (!ret.url) {
      // check doaj
      res = CLapi.internals.use.doaj.articles.search('bibjson.title.exact:"'+ret.title+'"');
      if (res.data && res.data.bibjson && res.data.bibjson.identifier) {
        for ( var bb in res.data.bibjson.identifier ) {
          if ( res.data.bibjson.identifier[bb].type === 'doi' && res.data.bibjson.identifier[bb].id === ident ) {
            ret.source = "DOAJ";
            ret.title = res.data.bibjson.title;
            for ( var ll in res.data.bibjson.link ) {
              if (!ret.url || res.data.bibjson.link[ll].type === 'fulltext') ret.url = res.data.bibsjon.link[ll].url;
            }
            break;
          }
        }
      }
    }
    // add places we can check with title here
  }
  
  // if still not found we can check doaj if we have the journal name, and see if it is OA
  // BUT would this give us a link to the article? - probably just link to journal at best...
  // by now if we had title or DOI we would have found it in DOAJ anyway, ideally, so this is just last resort journal link 
  // and at least we know the journal is open, so the user can find from there
  if (!ret.url && ret.journal) {
    res = CLapi.internals.use.doaj.journals.search('bibjson.journal.title:"'+ret.journal+'"');
    if (res && res.data && res.data.results && res.data.results.length > 0 ) {
      for ( var ju in res.data.results[0].bibjson.link ) {
        if (!ret.url && res.data.results[0].bibjson.link[ju].type === 'homepage') {
          ret.url = res.data.results[0].bibjson.link[ju].url;
          ret.source = "DOAJ";
          ret.journal_url = true;
          break;
        }
      }
    }    
  }
  
  // TODO is it worth adding Sherpa and Lantern data in here, for what we return on resolves?
  // It does not actually help with the resolve, but may be useful to people for other reasons...
  
  if (exists) {
    console.log('updating resolvers data');
    academic_resolved.update(exists._id,{$set: ret});
  } else if ( ret.url ) {
    console.log('saving new resolvers data object');
    academic_resolved.insert(ret);
  }
  console.log('done trying to resolve');
  return ret;
}

CLapi.internals.academic.doiresolve = function(doi) {
  doi = doi.replace('http://','').replace('https://','').replace('dx.doi.org/','');
  var doiresolver = 'http://doi.org/api/handles/' + doi;
  var url = false;
  try {
    console.log('Academic resolve doing DOI resolve for ' + doiresolver);
    // TODO NOTE that the URL given by crossref doi resolver may NOT be the final resolved URL. The publisher may still redirect to a different one
    var resp = Meteor.http.call('GET',doiresolver);
    if (resp.data) {
      for ( var r in resp.data.values) {
        if ( resp.data.values[r].type.toLowerCase() === 'url' ) {
          url = resp.data.values[r].data.value;
          if ( resp.data.values[r].data.format === 'base64' ) {
            // like these weird chinese ones, which end up throwing 404 anyway, but, just in case...
            // http://doi.org/api/handles/10.7688/j.issn.1000-1646.2014.05.20
            url = new Buffer(url,'base64').toString('utf-8');
          }
        }
      }
    }
  } catch(err) {}
  return url;
}

CLapi.internals.academic.undirect = CLapi.internals.academic.redirect_chain_resolve;
CLapi.internals.academic.redirect_chain_resolve = function(url) {
  // using external dependency to call request.head
  // because Meteor provides no way to access the final url from the request module, annoyingly

  // see this URL:
  // https://secure.jbs.elsevierhealth.com/action/getSharedSiteSession?rc=9&redirect=http%3A%2F%2Fwww.cell.com%2Fcurrent-biology%2Fabstract%2FS0960-9822%2815%2901167-7%3F%26np%3Dy&code=cell-site
  // redirects to:
  // http://www.cell.com/current-biology/abstract/S0960-9822(15)01167-7?&np=y
  // in a browser BUT in code gets stuck in redirect loop

  // many sites like elsevier ones on cell.com etc even once resolved will actually redirect the user again 
  // this is done via cookies and url params, and does not seem to accessible programmatically in a reliable fashion
  // so the best we can get for the end of a redirect chain may not actually be the end of the chain that a user 
  // goes through, so FOR ACTUALLY ACCESSING THE CONTENT OF THE PAGE PROGRAMMATICALLY, USE THE phantom.get method instead
  
  // here is an odd one that seems to stick forever:
  // https://kclpure.kcl.ac.uk/portal/en/publications/superior-temporal-activation-as-a-function-of-linguistic-knowledge-insights-from-deaf-native-signers-who-speechread(4a9db251-4c8e-4759-b0eb-396360dc897e).html
  
  console.log('Attempting redirect chain resolve for ' + url);
  var ret;
  if (url.indexOf('10') === 0 || url.indexOf('dx.doi.org') !== -1 ) {
    ret = CLapi.internals.academic.doiresolve(url);
  } else {
    var resolve = function(url, callback) {
      if ( url.indexOf('?') === -1 ) url += '?';
      var request = Meteor.npmRequire('request');
      request.head(url, {jar:true, headers: {'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'}}, function (err, res, body) {
        console.log(err);
        if ( res === undefined ) {
          callback(null, url);
        } else {
          callback(null, res.request.uri.href);
        }
      });
    };
    var aresolve = Async.wrap(resolve);
    ret = aresolve(url);
  }
  console.log('resolved ' + url + ' to ' + ret);
  return ret;
}


