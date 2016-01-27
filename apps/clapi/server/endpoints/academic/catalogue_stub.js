
// academic catalogue

// for this to be useful, it needs to be more than just a query endpoint, which could be handled by the elasticsearch endpoint

CLapi.addRoute('acat', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  }
});
