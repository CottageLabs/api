
// a zenodo API client

// http://zenodo.org/dev
// https://zenodo.org/api/deposit/depositions
// api key required: http://zenodo.org/dev#restapi-auth

CLapi.addRoute('use/zenodo', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the zenodo API functionality'} };
    }
  }
});
