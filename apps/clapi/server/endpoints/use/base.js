
// although via dissemin we can search DOI in BASE, it would be useful to search BASE ourselves
// they provide a search endpoint, but must register our IP to use it first
// register here: https://www.base-search.net/about/en/contact.php (registered)

// docs here:
// http://www.base-search.net/about/download/base_interface.pdf


CLapi.addRoute('use/base', {
  get: {
    action: function() {
			return {status: 'success', data: {info: 'Provides access to a subset of the BASE API'} };
    }
  }
});

CLapi.addRoute('use/base/search', {
  get: {
    action: function() {
			return CLapi.internals.use.base.search(this.queryParams.q,this.queryParams.from,this.queryParams.size);
    }
  }
});

CLapi.addRoute('use/base/doi/:doipre/:doipost', {
  get: {
    action: function() {
			return CLapi.internals.use.base.doi(this.urlParams.doipre+'/'+this.urlParams.doipost);
    }
  }
});

CLapi.internals.use.base = {};

CLapi.internals.use.base.doi = function(doi,title) {
	// TODO should simplify response down to just one result if possible
	// there is a dcdoi search available on BASE but often it is not the DOI, because they use it for "internal doi"
	// but the DOI can often be found elsewhere in the content, so can search for it in whole doc
	// TODO should consider deref via crossref then doing title search on BASE instead, if not found by DOI
	// e.g. 10.1016/j.biombioe.2012.01.022 can be found in BASE with title but not with DOI
	// also note when simplifying title that titles from crossref can include xml in them
	// like https://dev.api.cottagelabs.com/use/crossref/works/doi/10.1016/j.cpc.2016.07.035 
	// which has mathml in the title, perhaps put there by the publisher and not stripped by crossref, or put there by crossref
	var res = CLapi.internals.use.base.search(doi);
	if (res.data.numFound === 0) {
		if (!title) {
			var cr = CLapi.internals.use.crossref.works.doi(doi);
			if (cr && cr.data && cr.data.title) title = cr.data.title[0];
		}
		if (title) res = CLapi.internals.use.base.search('dctitle:"'+title.toLowerCase().replace(/(<([^>]+)>)/g,'').replace(/[^a-z0-9]/g,' ')+'"');
	}
	if (res && res.data && res.data.docs && res.data.docs.length > 0) res = {status:"success", data:res.data.docs[0]};
	return res;
}

CLapi.internals.use.base.search = function(qry,from,size) { 
	// base requires IP registration - my machine IP has been registered, but change if machine changes
	// limited to non-commercial and 1 query per second, contact them for more options
	// it uses offset and hits (default 10) for from and size, and accepts solr query syntax
	// string terms, "" to be next to each other, otherwise ANDed, can accept OR, and * or ? wildcards, brackets to group, - to negate
	if (qry === undefined) qry = '*';
  var proxy = Meteor.settings.clapi_proxy; // need to route through the proxy so requests come from registered IP
  if ( !proxy ) return { status: 'error', data: 'NO BASE PROXY SETTING PRESENT!'}
	if (qry.indexOf('"') === -1 && qry.indexOf(' ') !== -1) qry = qry.replace(/ /g,'+');
  var url = 'http://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&format=json&query=' + qry;
	if (from) url += '&offset=' + from;
	if (size) url += '&hits=' + size;
  console.log(url);
  try {
		var opts = {npmRequestOptions:{proxy:proxy}};
    var res = Meteor.http.call('GET', url, opts);
    if ( res.statusCode === 200 ) {
			return { status: 'success', data: JSON.parse(res.content).response}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: 'BASE API error', error: err}
  }
}


