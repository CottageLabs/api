
// although via dissemin we can search DOI in BASE, it would be useful to search BASE ourselves
// they provide a search endpoint, but must register our IP to use it first
// register here: https://www.base-search.net/about/en/contact.php

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

CLapi.addRoute('use/base/:qry', {
  get: {
    action: function() {
			return CLapi.internals.use.base.search(this.urlParams.qry);
    }
  }
});

CLapi.internals.use.base = {};
CLapi.internals.use.base.search = function(qry,from,size) { 
	// how does BASE do from and size - it uses offset and hits (default 10)
	// it accepts solr query syntax
	// https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&format=json&query=
  return {status: 'error', data: 'still in dev, sorry'}
}