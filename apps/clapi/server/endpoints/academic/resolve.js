
// resolve an ID to an open URL, and redirect to it if desired

academic_resolved = new Mongo.Collection("academic_resolved");
CLapi.addCollection(academic_resolved); // temp useful to view all the created links

CLapi.addRoute('academic/undirect', {
  get: {
    action: function() {
      return {status:'success', data: CLapi.internals.academic.undirect(this.queryParams.url) };
    }
  }
});

CLapi.addRoute('academic/phantom', {
  get: {
    action: function() {
      var format = this.queryParams.format ? this.queryParams.format : 'plain';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/' + format
        },
        body: CLapi.internals.academic.phantom(this.queryParams.url,this.queryParams.delay)
      };
    }
  }
});

CLapi.addRoute('academic/resolve', {
  get: {
    action: function() {
      var ident = this.queryParams.doi;
      if ( this.queryParams.url ) ident = this.queryParams.url;
      if ( this.queryParams.pmid ) ident = 'pmid' + this.queryParams.pmid;
      if ( this.queryParams.pmc ) ident = 'pmc' + this.queryParams.pmc;
      if ( ident ) {
        return CLapi.internals.academic.resolve(ident,undefined,this.queryParams.refresh);
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
CLapi.addRoute('academic/redirect/:doipre/:doipost', {
  get: function() {
    return CLapi.internals.academic.redirect(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.refresh);
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
  var possibles = CLapi.internals.academic.resolve(ident,undefined,refresh);
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
    // if there is no open content discoverable, redirect to a page that asks them to use oabutton to request it?
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: possibles
    };
  }
}

CLapi.internals.academic.resolve = function(ident,content,refresh) {
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
  if (!ident && content) {
    // no problem, content will be used at first check
  } else if (ident.toLowerCase().indexOf('pubmed/') !== -1) {
    ident = ident.substring((ident.indexOf('pubmed/')+7)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmid';
  } else if ( ident.indexOf('pubmedid=') !== -1 ) {
    ident = ident.substring((ident.indexOf('pubmedid=')+9)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmid';
  } else if ( ident.indexOf('/pmc') !== -1 ) {
    ident = ident.substring((ident.indexOf('/pmc')+4)).split('/')[0].split('#')[0].split('?')[0];
    type = 'pmc';
  } else if (ident.indexOf('10.') === 0 || ident.indexOf('dx.doi.org') !== -1) {
    if (ident.indexOf('10.') !== 0) ident = '10.' + ident.split('10.')[1];
    type = 'doi';
  }

  if (type === 'url') {
    console.log('academic resolve processing for URL')
    // is it worth doing a licence check on a URL? - if open, this is the URL (if there is a URL - could be content)
    // else we look for DOIs PMIDs PMC IDs in the page content
    if (!content) content = CLapi.internals.academic.phantom(ident,undefined);
    var meta = CLapi.internals.academic.catalogue.extract(undefined,content);
    if (meta.doi) {
      type = 'doi';
      ident = meta.doi;
      ret.doi = ident;
    }
    if (meta.pmc) {
      type = 'pmc';
      ident = meta.pmc;
      ret.pmc = ident;
    }
    if (meta.pmid) {
      type = 'pmid';
      ident = meta.pmid;
      ret.pmid = ident;
    }
  }

  // with a pmid or pmcid look up on eupmc
  if (type === 'pmid' || type === 'pmc') {
    console.log('academic resolve processing for URL')
    ret[type] = ident;
    res = CLapi.internals.use.europepmc[type](ident);
    if ( res.data.fullTextUrlList && res.data.fullTextUrlList.fullTextUrl ) {
      for ( var i in res.data.fullTextUrlList.fullTextUrl ) {
        var erl = res.data.fullTextUrlList.fullTextUrl[i];
        if ( erl.availabilityCode.toLowerCase() === 'oa' && erl.documentStyle.toLowerCase() === 'html') ret.url = erl.url;
      }
    }
    if (!ret.url && res.data.doi) {
      ident = res.data.doi;
      ret.doi = ident;
      type = 'doi';
    }
  }

  if (!ret.url && type === 'doi') {
    console.log('academic resolve processing for URL')
    ret.doi = ident;
    // no use looking up the DOI in crossref because that does not indicate openness of the URLs
    res = CLapi.internals.use.dissemin.doi(ident); // check dissemin (or does it just subset BASE?)
    if (res.data.pdf_url) ret.url = res.data.pdf_url;
    if (!ret.url) { // check BASE
      res = CLapi.internals.use.base.search(ident);
      if (res.data && res.data.docs && res.data.docs > 0 && res.data.docs[0].dclink) ret.url = res.data.docs[0].dclink;
    }
    // don't bother looking up CORE, it is unstable and subset of BASE
    /*if (!ret) {
      res = CLapi.internals.use.core.articles.doi(ident);
      if (res.data.fulltextIdentifier) ret.url = res.data.fulltextIdentifier;
    }*/
    // add other places to check with DOI here, until one of them sets ret to be a value
  }
    
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
  // goes through, so FOR ACTUALLY ACCESSING THE CONTENT OF THE PAGE PROGRAMMATICALLY, USE THE academic.phantom method instead
  
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



// return the content of the page at the redirected URL, after js has run
var _phantom = function(url,delay,callback) {
  if (url.indexOf('http') === -1) url = 'http://' + url;
  if (delay === undefined) delay = 2000;
  var phi,sp;
  var phantom = Meteor.npmRequire('phantom');
  console.log('starting phantom retrieval of ' + url);
  phantom.create()
    .then(function(ph) {
      phi = ph;
      console.log('creating page');
      return phi.createPage();
    })
    .then(function(page) {
      sp = page;
      console.log('retrieving page');
      return sp.open(url);
    })
    .then(function(status) {
      console.log('retrieving content');
      var Future = Npm.require('fibers/future');
      var future = new Future();
      setTimeout(function() { future.return(); }, delay);
      future.wait();
      return sp.property('content');
    })
    .then(function(content) {
      console.log('got content');
      sp.close();
      phi.exit();
      return callback(null,content);
    })
    .catch(function(error) {
      console.log('phantom errored');
      console.log(error);
      sp.close();
      phi.exit();
      return callback(null,'');
    });
    
}
CLapi.internals.academic.phantom = Async.wrap(_phantom);




