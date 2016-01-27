
// link shortener

// use a setting to set the URL route that we will resolve - probably ctg.li

CLapi.addRoute('shortlink', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a shortlink for any given URL'} };
      // if param "url" is present create a random short link for it and return the ID of it
    }
  },
  post: {
    action: function() {
      // if param "url" is present in url or in POSTed data create a random short link for it and return the ID of it
      // can also accept "shortlink" value for creating a specific one. Although this is possible below too
    }
  }
});

CLapi.addRoute('shortlink/:shortid', {
  get: {
    action: function() {
      // find the short ID and redirect to the link stored for it
    }
  },
  put: {
    authRequired: true,
    action: function() {
      // certain user groups can overwrite a shortlink
      // overwrite a short link ID that already exists, or create a new one if it does not
    }
  },
  post: {
    action: function() {
      // create a short ID link as named, if available. Otherwise say no.
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      // only certain group users can delete created shortlinks
    }
  }
});
