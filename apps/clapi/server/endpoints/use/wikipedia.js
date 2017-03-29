

CLapi.addRoute('use/wikipedia', {
  get: {
    action: function() {
      if (this.queryParams) {
        return CLapi.internals.use.wikipedia.lookup(this.queryParams);
      } else {
        return {status: 'success', data: {info: 'returns a subset of the github API functionality'} };
      }
    }
  }
});



// https://www.mediawiki.org/wiki/API:Main_page
// https://en.wikipedia.org/w/api.php

CLapi.internals.use.wikipedia = {}

CLapi.internals.use.wikipedia.lookup = function(opts) {
  if (!opts.titles && opts.title) {
    opts.titles = opts.title;
    delete opts.title;
  }
  if (!opts.titles) return {}
  var titleparts = opts.titles.split(' ');
  for ( var tp in titleparts ) titleparts[tp] = titleparts[tp][0].toUpperCase() + titleparts[tp].substring(1,titleparts[tp].length);
  opts.titles = encodeURIComponent(titleparts.join(' '));
  if (!opts.action) opts.action = 'query';
  if (!opts.prop) opts.prop = 'revisions|pageprops';
  if (!opts.rvprop) opts.rvprop = 'content';
  if (!opts.format) opts.format = 'json';
  // 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(opts.title) + '&prop=pageprops&format=json'
  var url = 'https://en.wikipedia.org/w/api.php?';
  for ( var o in opts) url += o + '=' + opts[o] + '&';
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    while (res.data.query.normalized && res.data.query.normalized.length) {
      url = url.replace(encodeURIComponent(res.data.query.normalized[0].from),encodeURIComponent(res.data.query.normalized[0].to));
      console.log(url);
      res = Meteor.http.call('GET',url);
    }
    var key;
    for ( var k in res.data.query.pages ) { if (key === undefined) key = k; } // just get the first one
    while ( res.data.query.pages[key].revisions[0]['*'].indexOf('#REDIRECT') === 0) {
      url = url.replace(encodeURIComponent(res.data.query.pages[key].title),encodeURIComponent(res.data.query.pages[key].revisions[0]['*'].split('[[')[1].split(']]')[0]));      
      console.log(url);
      res = Meteor.http.call('GET',url);
      key = undefined;
      for ( var ki in res.data.query.pages ) { if (key === undefined) key = ki; }
    }
    return {status:'success',data:res.data.query.pages[key]}
  } catch(err) {
    return {status:'error',data:err};
  }
}

