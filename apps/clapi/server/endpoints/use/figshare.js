// oabutton wants to be able to search figshare for content (unless SHARE covers it)
// https://github.com/OAButton/backend/issues/111

// https://docs.figshare.com/api/#searching-filtering-and-pagination

CLapi.addRoute('use/figshare', {
  get: {
    action: function() {
      return {status: 'success', routes: routes, data: {info: 'returns responses from the openaire API.'} };
    }
  }
});

CLapi.addRoute('use/figshare/search', {
  get: {
    action: function() {
      return CLapi.internals.use.figshare.search(this.queryParams);
    }
  }
});

CLapi.addRoute('use/figshare/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.figshare.doi(this.urlParams.doipre + '/' + this.urlParams.doipost);
    }
  }
});



CLapi.internals.use.figshare = {};

CLapi.internals.use.figshare.doi = function(doi) {
  var res = CLapi.internals.use.figshare.search({search_for:doi});
  if (res.data && res.data.length && res.data[0].doi === doi) {
    return {status: 'success', data: res.data[0]};
  } else {
    return {status:'error'};
  }
}

CLapi.internals.use.figshare.search = function(params) {
  var url = 'https://api.figshare.com/v2/articles/search';
  // search_for is required
  console.log('searching figshare for ' + url);
  console.log(params);
  try {
    var res = Meteor.http.call('POST', url, {data:params,headers:{'Content-Type':'application/json'}}); // ONLY works on POST
    if ( res.statusCode === 200 ) {
      var ret = res.data;
      return { status: 'success', data: ret}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: 'figshare API error'}
  }

}

