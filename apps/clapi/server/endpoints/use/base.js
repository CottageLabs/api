
// although via dissemin we can search DOI in BASE, it would be useful to search BASE ourselves
// they provide a search endpoint, but must register our IP to use it first
// register here: https://www.base-search.net/about/en/contact.php (registered)

// docs here:
// http://www.base-search.net/about/download/base_interface.pdf


CLapi.addRoute('use/base', {
  get: {
    action: function() {
			if ( this.queryParams.q ) {
				return CLapi.internals.use.base.search(this.queryParams.q);
			} else {
	      return {status: 'success', data: {info: 'Provides access to a subset of the BASE API'} };
			}
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

CLapi.internals.use.base = {};
CLapi.internals.use.base.search = function(qry,from,size) { 
	// base requires IP registration - my machine IP has been registered, but change if machine changes
	// limited to non-commercial and 1 query per second, contact them for more options
	// it uses offset and hits (default 10) for from and size, and accepts solr query syntax
	if (qry === undefined) qry = '*';
  var proxy = Meteor.settings.clapi_proxy; // need to route through the proxy so requests come from registered IP
  if ( !proxy ) return { status: 'error', data: 'NO BASE PROXY SETTING PRESENT!'}
  var url = 'http://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&format=json&query="' + qry + '"';
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


