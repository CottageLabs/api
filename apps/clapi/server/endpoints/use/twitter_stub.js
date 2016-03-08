// https://dev.twitter.com/rest/public/search
// https://dev.twitter.com/streaming/overview

CLapi.addRoute('use/twitter', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the twitter API. Stub in progress, does nothing yet'} };
    }
  }
});
