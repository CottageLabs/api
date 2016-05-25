
// should do something like the open citations corpus functionality

CLapi.addRoute('academic/citations', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'citations analysis endpoint - stub in progress'} };
    }
  }
});
