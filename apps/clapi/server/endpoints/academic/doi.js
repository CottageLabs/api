
// a multi use endpoint
// get results back from many use endpoints at once

CLapi.addRoute('academic/doi', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'return everything we can find about a DOI, from all "use" sources available'} };
    }
  }
});

CLapi.addRoute('academic/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.academic.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});

CLapi.internals.academic.doi = function(doi) {
  var ret = {status: 'success', data: {}};
  ret.data.crossref = CLapi.internals.use.crossref.works.doi(doi);
  ret.data.core = CLapi.internals.use.core.articles.doi(doi);
  ret.data.dissemin = CLapi.internals.use.dissemin.doi(doi);
  ret.data.europepmc = CLapi.internals.use.europepmc.doi(doi);
  return ret;
}
