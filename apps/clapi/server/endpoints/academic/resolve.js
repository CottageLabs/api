
// resolve an ID to an open URL, and redirect to it if desired

CLapi.addRoute('academic/resolve', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Searches for data about an article ID and attempts to return a set of useful open access URLs. \
        This is like dx.doi.org, the DOI resolver, although this route is just the access to the JSON metadata about the URLs we can find. \
        Also it actually accepts DOI, PMID, or PMC ID appended to the URL, and will even try with just a URL to see if any of the accepted \
        IDs can be found there to work with. If you want to actually be redirected instead of getting the data, use the "redirect" route \
        instead of this "resolve" route. \
        Stub STILL in progress'} };
    }
  }
});
CLapi.addRoute('academic/redirect', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Resolves an ID to an open access URL and redirects to it. Like dx.doi.org, the DOI resolver. \
        But actually accepts DOI, PMID, or PMC ID appended to the URL, or even tries with just being given a URL in which case it looks for \
        any of the useful IDs on the page the URL points to. If an OA URL cannot be found this route \
        will return a 404 and the JSON object of the URLs that we could actually find. If you want direct access to that JSON object, \
        then use the "resolve" route instead of the "redirect" route and it will be delivered to you as JSON with no redirect or 404. The \
        default preferred format to redirect to is html then pdf then xml, but can be set to "prefer=xml" or "prefer=pdf" as a query parameter \
        Stub STILL in progress'} };
    }
  }
});

CLapi.addRoute('academic/resolve/:doipre/:doipost', {
  get: {
    action: function() {        
      return CLapi.internals.academic.resolve(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});
CLapi.addRoute('academic/resolve/:anid', {
  get: {
    action: function() {
      return CLapi.internals.academic.resolve(this.urlParams.anid);
    }
  }
});

// TODO add a route to receive notifications that the URL we returned was not open
// which should also provide a way for someone to inform us of an alternate that is open
// in which case they must authenticate themselves to confirm they are a worthy source of such alternate information
// can be as simple as them signing up with an account and confirming their email so we know who they are and that they are real
// then we can record who told us of the alternate URL and save it wherever we are saving all this url redirect info

CLapi.addRoute('academic/redirect/:doipre/:doipost', {
  get: function() { return CLapi.internals.academic.redirect(this.urlParams.doipre + '/' + this.urlParams.doipost, this.queryParams.prefer); }
});
CLapi.addRoute('academic/redirect/:anid', {
  get: function() { return CLapi.internals.academic.redirect(this.urlParams.anid, this.queryParams.prefer); }
});
// TODO could also just have a URL... HOW TO GET THE FULL URL ROUTE OUT OF RESTIVUS!!!!

CLapi.internals.academic.redirect = function(ident,prefer) {
  var urls = CLapi.internals.academic.resolve(ident);
  if (prefer && urls.format[prefer]) {
    console.log('resolved and redirecting to ' + urls.format[prefer]);
    return {
      statusCode: 302,
      headers: {
        'Content-Type': 'text/plain',
        'Location': urls.format[prefer]
      },
      body: 'Location: ' + urls.format[prefer]
    };
  } else if (urls.url) {
    console.log('resolved and redirecting to ' + urls.url);
    return {
      statusCode: 302,
      headers: {
        'Content-Type': 'text/plain',
        'Location': urls.url
      },
      body: 'Location: ' + urls.url
    };
  } else {
    console.log('resolving failed, returning JSON metadata and 404');
    // if there is no open content discoverable, redirect to a page that asks them to use oabutton to request it?
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: urls
    };
  }
}

CLapi.internals.academic.resolve = function(ident) {
  // resolve the ID
  // could be DOI, PMID, PMC... for now
  // return the URLs
  
  var possibles = {
    url: false, // best matching open url to content, preferring html then pdf (because this is primarily about viewing)'
    format: {
      xml: false, // open url to xml
      html: false, // open url to html
      pdf: false // open url to pdf
    },
    splash: false, // url to splash page if known and different (DOIs always go to splash page for example)
    all: [] // all links found for this document
  }

  // TODO: first should be a lookup against our own catalogue to check for URLs and IDs and links
  // if we already know it just return it
  // if we don't already know all the stuff about to be worked out below, we should save it (to catalogue or to resolvers db?)
  // if we already know it should there be some sort of "force-reload" option where we refresh what we know? Maybe...
  
  var doi;
  // TODO: can add other sorts of identifier handlers in here
  if ( ident.toLowerCase().indexOf('pm') === 0 ) {
    // then convert PMID or PMCID to DOI
    // with PMC or PMID can also look up europepmc with them directly 
    // (but still worth doing the full search too in case other endpoints return more useful info)
  } else if ( ident.indexOf('10') === 0 ) {
    doi = ident;
  } else {
    // ident could be a URL - see if there is a PMID or PMC or DOI in the URL itself
    // otherwise GET the URL and see if we can find a DOI or PMID or PMC on the page content
    // also append this URL itself to the possibles.all list
    possibles.all.push(ident);
  }

  var info = CLapi.internals.academic.doi(doi);

  // check europepmc data
  try {
    if ( info.data.europepmc.data.fullTextUrlList.fullTextUrl ) {
      for ( var ii in info.data.europepmc.data.fullTextUrlList.fullTextUrl ) {
        var erl = info.data.europepmc.data.fullTextUrlList.fullTextUrl[ii];
        if ( possibles.all.indexOf(erl.url) === -1 ) possibles.all.push(erl.url);
        if ( erl.availabilityCode.toLowerCase() === 'oa') {
          if (erl.documentStyle.toLowerCase() === 'html') {
            possibles.format.html = erl.url;
            possibles.url = erl.url;
            possibles.splash = erl.url;
          }
          if (erl.documentStyle.toLowerCase() === 'pdf') {
            possibles.format.pdf = erl.url;
            if ( !possibles.url ) possibles.url = erl.url;
          }
          if (erl.documentStyle.toLowerCase() === 'xml') possibles.format.xml = erl.url;
        }
      }
    }    
  } catch(err) {}

  // check dissemin data
  try { 
    if (info.data.dissemin.data.pdf_url) {
      if ( possibles.all.indexOf(info.data.dissemin.data.pdf_url) === -1 ) possibles.all.push(info.data.dissemin.data.pdf_url); 
      possibles.format.pdf = info.data.dissemin.data.pdf_url; 
      if (!possibles.url) possibles.url = info.data.dissemin.data.pdf_url;
    }
  } catch (err) {}

  // check core data
  try { 
    if (info.data.core.data.fulltextIdentifier) {
      if ( possibles.all.indexOf(info.data.core.data.fulltextIdentifier) === -1 ) possibles.all.push(info.data.core.data.fulltextIdentifier); 
      // what sort of fulltext does core deliver? only PDF?
    }
  } catch (err) {}

  // check crossref data
  try {
    if ( info.data.crossref.link ) {
      for ( var i in info.data.crossref.data.link ) {
        if ( possibles.all.indexOf(info.data.crossref.data.link[i].URL) === -1 ) possibles.all.push(info.data.crossref.data.link[i].URL);
        // can any of these be html, xml, or pdf URLs that are likely to be open?
        // does crossref have any other useful links, like tdm license links etc?
      }
    }
    if (info.data.crossref.data.URL) {
      if ( possibles.all.indexOf(info.data.crossref.data.URL) === -1 ) possibles.all.push(info.data.crossref.data.URL);
    }
    // crossref must have a splash page, at least the DOI link, so add that to splash if not already set
  } catch (err) {}

  // TODO if DOI lookup gets expanded to use more sources, add them in here
  // but add them in order that only overwrites possibles values consistenly with preference (open, html, pdf)
    
  for ( var p in possibles ) {
    var url = possibles[p];
    //var head = Meteor.http.call('HEAD', url);
    // if any sort of redirect status code, follow it and keep going until we get a 200
    // if 200 is never got, this url is no good
    // if 200 is got, check the content-length. if it is 20, or small, then probably this is not something we can access usefully
    // if it is of useful size and content type is xml or pdf then just get it
    // if of useful size and content type is html then get it BUT
    // html could just be a landing page. so... search for a links with "pdf" or "xml" in them? how else to tell?
    // if html does not seem to just be a landing page, how to know which part of it is the actual article?
    // could length define whether a landing page or not?
    // even if content found, also check for preferred format
    // if not the preferred format store this one and keep going
    // once content of preferred format is found, return it
    
    // for some URLs we may know there is an api we can redirect to...
    // e.g. europepmc can rewrite the url to their API url and get the content that way
    // but how will we know a URL is necessarily available via that API?
    // if it is a europepmc url no problem, but there can be articles that are also in there but we may have a different url for it
    // is there any way at all to resolve all URLs to one definite one, beyond maintaining a large match table?
    // could do a regex match on the html text content of every url we see, looking for a doi. then at least can map all URLs onto a doi.
    // then for any url look for its matching doi, and then we also know any matching URLs that may be somewhere with an API to redirect to
  }
  
  // if we did not know about this URL before, save the info we have recovered somewhere? Catalogue or some resolves db?
  
  return possibles;
  
}