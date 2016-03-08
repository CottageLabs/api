
// an academic multi search endpoint
// get results back from many use endpoints at once

CLapi.addRoute('academic/search', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'return everything we can find about a DOI, from all "use" sources available'} };
    }
  }
});

CLapi.addRoute('academic/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.academic.search(this.urlParams.qry, this.queryParams.from, this.queryParams.size);
    }
  }
});

CLapi.internals.academic.search = function(qry,from,size) {
  var ret = {status: 'success', data: {}};
  ret.data.crossref = CLapi.internals.use.crossref.works.search(qry,from,size);
  ret.data.core = CLapi.internals.use.core.articles.search(qry,from,size);
  ret.data.europepmc = CLapi.internals.use.europepmc.search(qry,from,size);
  ret.data.base = CLapi.internals.use.base.search(qry,from,size);
  return ret;
}

