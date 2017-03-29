
// https://developer.github.com/v3/

CLapi.addRoute('use/github', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the github API functionality'} };
    }
  }
});

CLapi.addRoute('use/github/issues', {
  get: {
    action: function() {
      return CLapi.internals.use.github.issues(this.queryParams);
    }
  }
});



CLapi.internals.use.github = {}

CLapi.internals.use.github.issues = function(opts) {
  // https://developer.github.com/v3/issues/#list-issues-for-a-repository
  var root = 'https://api.github.com/'; // add username:password@ to get higher rate limit - only get 60 without auth
  var page = 1;
  // add param "state" with value "open" "closed" or "all" - defaults to "open"
  var url = root + 'repos/' + opts.owner + '/' + opts.repo + '/issues?per_page=100&page=';
  var issues = [];
  try {
    var readlast = false;
    var last = 1;
    while (page <= last) {
      var tu = url + page;
      console.log(tu);
      var res = Meteor.http.call('GET', tu, {headers:{'User-Agent':opts.owner}});
      for ( var d in res.data ) issues.push(res.data[d]);
      page += 1;
      try {
        if (!readlast) {
          readlast = true;
          last = parseInt(res.headers.link.split('next')[1].split('&page=')[1].split('>')[0]);
        }
      } catch(err) {}
    }
  } catch(err) {
    return {status:'error',data:err};
  }
  return {status:'success',total:issues.length,data:issues};
}

