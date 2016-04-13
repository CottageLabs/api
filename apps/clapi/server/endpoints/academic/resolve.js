
// resolve an ID to an open URL, and redirect to it if desired

Resolvers = new Mongo.Collection("resolvers");
CLapi.addCollection(Resolvers); // temp useful to view all the created links

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
      return CLapi.internals.academic.redirect(ident,this.queryParams.prefer,this.queryParams.refresh);
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
CLapi.addRoute('academic/redirect/:doipre/:doipost', {
  get: function() {
    return CLapi.internals.academic.redirect(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.prefer,this.queryParams.refresh);
  }
});
CLapi.addRoute('academic/resolved/:rid', {
  post: function() { // should become a way with authentication for other systems to update the resolvers object, like oabutton
  },
  delete: function() {
    action: {
      var res = Resolvers.findOne(this.urlParams.rid);
      if (res) {
        Resolvers.remove(this.urlParams.rid);
        return {status: 'success'}
      } else {
        return {
          statusCode: 404,
          body: {status: 'error', 'data': '404 not found'}
        }
      }
    }
  }
});

// TODO add a route to receive notifications that the URL we returned was not open
// which should also provide a way for someone to inform us of an alternate that is open
// in which case they must authenticate themselves to confirm they are a worthy source of such alternate information
// can be as simple as them signing up with an account and confirming their email so we know who they are and that they are real
// then we can record who told us of the alternate URL and save it wherever we are saving all this url redirect info

CLapi.internals.academic.redirect = function(ident,prefer,refresh) {
  var possibles = CLapi.internals.academic.resolve(ident,undefined,refresh);
  // check for a cookie link to hit first, and if so hit it and get the cookies then add them below
  // and note this nginx proxy config problem to change settings to compensate:
  // http://stackoverflow.com/questions/13894386/upstream-too-big-nginx-codeigniter/13896157#13896157
  var cookie = '';
  if (possibles.cookie) {
    var res = Meteor.http.call('GET',possibles.cookie);
    if (res.headers['set-cookie']) {
      cookie = res.headers['set-cookie'].join( "; " );
      console.log('grabbed cookie from ' + possibles.cookie + ' before redirecting to ' + possibles.url);
    }
  }
  if (prefer && possibles[prefer]) {
    console.log('resolved ' + ident + ' and redirecting to ' + possibles[prefer]);
    return {
      statusCode: 302,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'text/plain',
        'Location': possibles[prefer]
      },
      body: 'Location: ' + possibles[prefer]
    };
  } else if (possibles.url) {
    console.log('resolved ' + ident + ' and redirecting to ' + possibles.url);
    return {
      statusCode: 302,
      headers: {
        'Set-Cookie': cookie,
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

CLapi.internals.academic.resolve = function(ident,possibles,refresh) {
  // resolve the ID
  // could be DOI, PMID, PMC... for now
  // could also be a URL from which we try to find a DOI or PMID or PMC
  // return the URLs
  
  // first should be a lookup against our own catalogue to check for URLs and IDs and links
  // if we already know it just return it
  // if we don't already know all the stuff about to be worked out below, we should save it (to catalogue or to resolvers db?)
  // if we already know it should there be some sort of "force-reload" option where we refresh what we know? Maybe...
  var exists;
  var lookup = ident;
  if (ident.indexOf('pm') === 0) {
    lookup = ident.replace('pmid','').replace('pmc','');
    exists = Resolvers.findOne({identifiers:ident});
  } else if ( ident.indexOf('10') === 0 ) {
    exists = Resolvers.findOne({identifiers:ident});
  } else {
    exists = Resolvers.findOne({urls:ident});
  }
  if (exists && !refresh) {
    console.log('resolvers record found and refresh not requested, returning stored data');
    return exists;
  }
  
  if ( possibles === undefined ) {
    possibles = {
      url: false, // best matching open url to content, preferring html then pdf (because this is primarily about viewing)'
      cookie: false, // if a pdf or xml url is retrieved from within a page, cookies can be required. So here is where to go first to save them
      xml: false, // open url to xml
      html: false, // open url to html
      pdf: false, // open url to pdf
      splash: false, // url to splash page if known and different (DOIs always go to splash page for example)
      doi: false,
      pmid: false,
      pmc: false,
      urls: [], // all links found for this document, whether open or closed
      identifiers: [] // all identifiers found for this document
    }
  }
  
  var _addto = function(keys,val) {
    if (val === undefined || val.length === 0) return;
    for ( var k in keys ) {
      var key = keys[k];
      if (key === 'identifiers' || key === 'pmid' || key === 'pmc' || key === 'doi') {
        if (key !== 'doi') val = val.toLowerCase();
        val = val.replace('pmc','').replace('pmid','').replace('pm','');
        if (possibles.identifiers.indexOf(val) === -1 && possibles.identifiers.indexOf(val.toLowerCase()) === -1) possibles.identifiers.push(val);
        if (key === 'doi' && !possibles.splash) possibles.splash = 'http://dx.doi.org/' + val;
        if (key === 'doi' && possibles.urls.indexOf('http://dx.doi.org/' + val) === -1) possibles.urls.push('http://dx.doi.org/' + val);
        if (key !== 'identifiers') possibles[key] = val;
      } else {
        if (val.indexOf('https') === -1) val = 'http://' + val.replace('http://','');
        if (key !== 'urls') possibles[key] = val;
        if (possibles.urls.indexOf(val) === -1 && possibles.urls.indexOf(val.toLowerCase()) === -1) possibles.urls.push(val);
      }      
    }
  }
  
  var _geteupmc = function(type,ident) {
    var rec = CLapi.internals.use.europepmc[type](ident);
    if ( rec.data.fullTextUrlList && rec.data.fullTextUrlList.fullTextUrl ) {
      for ( var ii in rec.data.fullTextUrlList.fullTextUrl ) {
        var erl = rec.data.fullTextUrlList.fullTextUrl[ii];
        _addto(['urls'],erl.url);
        if ( erl.availabilityCode.toLowerCase() === 'oa') {
          if (erl.documentStyle.toLowerCase() === 'html') _addto(['html','url','splash'],erl.url);
          if (erl.documentStyle.toLowerCase() === 'pdf') _addto(['pdf'],erl.url);
          if (erl.documentStyle.toLowerCase() === 'xml') _addto(['xml'],erl.url);
        }
      }
    }    
    if (rec.data.doi) _addto(['doi'],rec.data.doi);
    if (rec.data.pmid) _addto(['pmid'],rec.data.pmid);
    if (rec.data.pmcid) _addto(['pmc'],rec.data.pmcid);
  }

  ident = ident.toLowerCase();
  if (ident.indexOf('pubmed/') !== -1) {
    ident = 'pmid' + ident.substring((ident.indexOf('pubmed/')+7)).split('/')[0].split('#')[0].split('?')[0];
  } else if ( ident.indexOf('pubmedid=') !== -1 ) {
    ident = 'pmid' + ident.substring((ident.indexOf('pubmedid=')+9)).split('/')[0].split('#')[0].split('?')[0];
  } else if ( ident.indexOf('/pmc') !== -1 ) {
    ident = 'pmc' + ident.substring((ident.indexOf('/pmc')+4)).split('/')[0].split('#')[0].split('?')[0];
  }
  
  var rec;
  if ( ident.indexOf('pm') === 0 ) {
    if ( ident.indexOf('pmc') === 0) {
      _addto(['pmc'],ident);
      _geteupmc('pmc',possibles.pmc); 
    } else {
      _addto(['pmid'],ident);
      _geteupmc('pmid',possibles.pmid);
    }
  }
  
  if ( !possibles.url && (possibles.doi || ident.indexOf('10') === 0) ) {
    if (possibles.doi) ident = possibles.doi;
    var doiresolvesto = CLapi.internals.academic.doiresolve(ident);
    _addto(['urls'],doiresolvesto);
    rec = CLapi.internals.use.crossref.works.doi(ident);
    if ( rec.data.link ) {
      for ( var i in rec.data.link ) {
        _addto(['urls'],rec.data.link[i].URL);
        // can any of these be html, xml, or pdf URLs that are likely to be open?
        // does crossref have any other useful links, like tdm license links etc?
        // is there any way to easily tell what is at these links or find URLS to fulltexts from them?
      }
    }
    if (rec.data.URL) _addto(['urls'],rec.data.URL); // what sort of URL is this, ever anything other than the DOI as a URL?
    _addto(['doi'],ident);
    if (!possibles.url) _geteupmc('doi',ident);
    
  // TODO if new ID types are to be supported ensure there is a way to identify them incoming, before we assume we are resolving a URL
  } else if ( ident.indexOf('.') !== -1) {
    // need at least a dot to be a valid url e.g. example.com
    // move this down to where all other URLs are checked
    _addto(['urls'],ident);
  }

  // if still no URL check dissemin data
  if (!possibles.url && possibles.doi) {
    rec = CLapi.internals.use.dissemin.doi(possibles.doi);
    if (rec.data.pdf_url) {
      // Note that sometimes the dissemin result is actually the splash page, not the pdf page
      if (rec.data.pdf_url.indexOf('pdf') === -1 ) {
        _addto(['urls'],rec.data.pdf_url);
      } else {
        _addto(['url','pdf'],rec.data.pdf_url);        
      }
    }
    // what other useful URLs may we get from dissemin? It returns info from core etc, but pulls up the most useful link to pdf_url anyway
  }

  // if still no URL check core data
  // ignore core, it still returns incorrect results, if any. See the usual obstm example - correct in base, dissemin, eupmc, wrong in core
  /*if (!possibles.url && possibles.doi) { // can we and is it worth checking core with something other than DOI?
    rec = CLapi.internals.use.core.articles.doi(possibles.doi);
    if (rec.data.fulltextIdentifier) _addto(['url','pdf'],rec.data.fulltextIdentifier);
    // what sort of fulltext does core deliver? only PDF? What could this be pointing at? What other useful links could be here?
  }*/
  
  // if still nothing and have not found at least one sort of URL then check all known URLs for content and/or links to content?
  // is it possible to know that any URLs are related to APIs that we can also recover content from?
  console.log('at url checking point');
  var duds = [];
  if ( !possibles.url && (!possibles.pmid || !possibles.pmc || !possibles.doi) ) {
    for ( var c in possibles.urls) {
      if (possibles.url) break;
      var curl = possibles.urls[c];
      if (possibles.doi && curl.indexOf('dx.doi.org') !== -1) break; // do not redo dois
      console.log('trying URLs ' + curl);
      var content;
      try {
        var resp = Meteor.http.call('GET',curl,{npmRequestOptions: {followRedirect:true,followAllRedirects:true,maxRedirects:30}});
        content = resp.content
      } catch(err) {
        duds.push(curl);
        break;        
      }
      var numberregex = new RegExp('[0-9]{1,10}');
      if (!possibles.pmid) {
        console.log('looking for pmid in page');
        content = content.split('pmid');
        content.length === 1 ? content = content[0] : content = content[1].substring(0,15);
        if ( content.length < 17 ) {
          var foundpmid = content.match(numberregex);
          if (foundpmid) {
            console.log('found' + foundpmid[0]);
            _addto(['pmid'],foundpmid[0]);
            return CLapi.internals.academic.resolve('pmid' + possibles.pmid,possibles);
          }
        }
      }
      if (!possibles.pmc) {
        console.log('looking for pmc in page');
        content = content.split('pmc');
        content.length === 1 ? content = content[0] : content = content[1].substring(0,15);
        if ( content.length < 17 ) {
          var foundpmc = content.match(numberregex);
          if (foundpmc) {
            console.log('found' + foundpmc[0]);
            _addto(['pmc'],foundpmc[0]);
            return CLapi.internals.academic.resolve('pmc' + possibles.pmc,possibles);
          }
        }
      }
      if (!possibles.doi) {
        console.log('looking for doi in page');
        var doiregex = new RegExp('\b(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?!["&\'])\S)+)\b');
        var founddoi = content.match(doiregex);
        if (founddoi) {
          console.log('found' + founddoi[0]);
          _addto(['doi'],founddoi[0]);
          return CLapi.internals.academic.resolve(possibles.doi,possibles);
        }
      }
      // look for a pdf link on the page, or an xml link on the page
      console.log('looking for pdf or xml URLs in page');
      content = content.split('<body');
      content.length === 1 ? content = content[0] : content = content[1];
      content = content.split('</body')[0];
      // find any urls containing the strings pdf or xml inside href="" tags
      var urlregex = new RegExp('href="[^ ]+?(pdf|xml)[^ ]*?"');
      var foundurl = content.match(urlregex);
      if (foundurl) {
        console.log('found ' + foundurl[0]);
        var turl = foundurl[0].replace('href="','').replace('"','');
        if (turl.indexOf('/') === 0) turl = curl.replace('://','______').split('/')[0].replace('______','://') + turl;
        // look for the words "buy" or "purchase" - if they are not found is that enough to guess it is open?
        // NOTE that even on an open one via sciencedirect, the pdf link will refuse to work without the cookies from hitting the splash page
        // and that even on the open ones the api calls to elsevier for text mining links fail too without the crossref keys etc
        // who knows which ones need cookies, so for now any time a link is found this way store the page to hit first for cookies
        // and code the redirector to look for this and hit that page first then continue with the cookies
        // for example see http://dx.doi.org/10.1016/j.cell.2011.02.013
        possibles.cookie = curl;
        if (content.toLowerCase().indexOf('buy') === -1 && content.toLowerCase().indexOf('purchase') === -1) {
          _addto(['url'],turl);
          if (turl.indexOf('xml') !== -1) _addto(['xml'],turl);
          if (turl.indexOf('pdf') !== -1) _addto(['pdf'],turl);
        } else {
          _addto(['urls'],turl);
        }
      }
      
      // if we get to here we found no useful identifiers on the page
    }
  }

  for ( var d in duds ) {
    var dud = duds[d];
    var loc = possibles.urls.indexOf(dud);
    if ( loc !== -1 ) possibles.urls.splice(loc,1);
    if (possibles.url === dud) possibles.url = false;
  }
  
  //if (possibles.url && possibles.url.indexOf('dx.doi.org') !== -1) _addto(['url'],CLapi.internals.academic.redirect_chain_resolve(possibles.url));
        
  // if exists (and we got to here then we are rerunning)
  if (exists) {
    console.log('updating resolvers data');
    Resolvers.update(exists._id,{$set: possibles}); // does this work?
  } else {
    console.log('saving new resolvers data object');
    Resolvers.insert(possibles);
  }
  
  console.log('done trying to resolve');
  return possibles;
}

CLapi.internals.academic.doiresolve = function(doi) {
  doi = doi.replace('http://','').replace('https://','').replace('dx.doi.org/','');
  var doiresolver = 'http://doi.org/api/handles/' + doi;
  var resp = Meteor.http.call('GET',doiresolver);
  var url = false;
  console.log(resp);
  if (resp.data) {
    for ( var r in resp.data.values) {
      if ( resp.data.values[r].type.toLowerCase() === 'url' ) url = resp.data.values[r].data.value;
    }
  }
  return url;
}

CLapi.internals.academic.redirect_chain_resolve = function(url) {
  // this does not really need to be done here using external dependencey
  // meteor can use meteor.http.call as shown above, but there is an annoying eventemitter bug in request
  // tried doing it direct here to maybe catch better but actually makes no difference.
  // so could revert
  // https://github.com/request/request/issues/311
  // can this be done with just Meteor.http.call instead of requiring external request dep? - yes see above
  // but no not for head requests - Meteor provides no way to access the final url from the request module, annoyingly
  if (url.indexOf('10') === 0) url = 'http://dx.doi.org/' + url;
  var resolve = function(url, callback) {
    var request = Meteor.npmRequire('request');
    request.head(url, function (err, res, body) {
      console.log(err);
      if ( res === undefined ) {
        console.log(url);
        callback(null, url);
      } else {
        //console.log(res.request.uri.href);
        callback(null, res.request.uri.href);        
      }
    });
  };
  var aresolve = Async.wrap(resolve);
  var ret = aresolve(url);
  console.log('resolved ' + url + ' to ' + ret);
  return ret;
}



