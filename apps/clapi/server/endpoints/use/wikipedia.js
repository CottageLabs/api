

CLapi.addRoute('use/wikipedia', {
  get: {
    action: function() {
      if (this.queryParams) {
        var tp;
        if (this.queryParams.type) {
          tp = this.queryParams.type;
          delete this.queryParams.type;
        }
        return CLapi.internals.use.wikipedia.lookup(this.queryParams,tp);
      } else {
        return {status: 'success', data: {info: 'returns a subset of the github API functionality'} };
      }
    }
  }
});

CLapi.addRoute('use/wikidata/:qid', {
  get: {
    action: function() {
      return CLapi.internals.use.wikidata.retrieve(this.urlParams.qid,this.queryParams.all);
    }
  }
});

CLapi.addRoute('use/wikidata/find', {
  get: {
    action: function() {
      return CLapi.internals.use.wikidata.find(this.queryParams.q,this.queryParams.url);
    }
  }
});

CLapi.addRoute('use/wikidata/properties', {
  get: {
    action: function() {
      return wikidata_properties;
    }
  }
});
CLapi.addRoute('use/wikidata/properties/:prop', {
  get: {
    action: function() {
      return wikidata_properties[this.urlParams.prop];
    }
  }
});


// https://en.wikinews.org/wiki/Category:Apple_Inc.
CLapi.internals.use.wikinews = {}
CLapi.internals.use.wikinews.about = function(entity) {
  // given the entity name, look up the wikinews category
  // get the list of all relevant articles
  // get all relevant articles, or just the list?
  // process them in some way?
}

CLapi.internals.use.wikidata = {}

CLapi.internals.use.wikidata.retrieve = function(qid,all) {
  var u = 'https://www.wikidata.org/wiki/Special:EntityData/' + qid + '.json';
  var res = Meteor.http.call('GET',u);
  try {
    var r = all ? res.data.entities[qid]: {};
    r.type = res.data.entities[qid].type;
    r.qid = res.data.entities[qid].id;
    try { r.label = res.data.entities[qid].labels.en.value; } catch(err) {}
    try { r.description = res.data.entities[qid].descriptions.en.value; } catch(err) {}
    try { r.wikipedia = res.data.entities[qid].sitelinks.enwiki.url; } catch(err) {}
    try { r.wid = res.data.entities[qid].sitelinks.enwiki.url.split('wiki/').pop(); } catch(err) {}
    r.infokeys = [];
    r.info = {};
    for ( var c in res.data.entities[qid].claims ) {
      var claim = res.data.entities[qid].claims[c];
      var wdp = wikidata_properties[c];
      if (wdp === undefined) wdp = c;
      r.infokeys.push(wdp);
      for ( var s in claim ) {
      }
      r.info[wdp] = claim;
    }
    return r;
  } catch(err) {
    return {};
  }
}

CLapi.internals.use.wikidata.find = function(entity,wurl,retrieve) {
  if (retrieve === undefined) retrieve = true;
  var res = {};
  if (entity === undefined && wurl) entity = wurl.split('wiki/').pop();
  var w = CLapi.internals.use.wikipedia.lookup({title:entity});
  try { res.qid = w.data.pageprops.wikibase_item } catch(err) {}
  if (res.qid && retrieve) res.data = CLapi.internals.use.wikidata.retrieve(res.qid);
  return res;
}

// https://www.mediawiki.org/wiki/API:Main_page
// https://en.wikipedia.org/w/api.php

CLapi.internals.use.wikipedia = {}

CLapi.internals.use.wikipedia.lookup = function(opts,type) {
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
    var disambiguation = [];
    var redirect = [];
    for ( var k in res.data.query.pages ) { if (key === undefined) key = k; } // just get the first one
    while ( res.data.query.pages[key].revisions[0]['*'].indexOf('#REDIRECT') === 0 || ( res.data.query.pages[key].pageprops && res.data.query.pages[key].pageprops.wikibase_item === 'Q224038' ) ) {
      var rv = res.data.query.pages[key].revisions[0]['*'];
      if ( type && res.data.query.pages[key].pageprops && res.data.query.pages[key].pageprops.wikibase_item === 'Q224038' ) {
        if (type === 'organization') type = 'organisation';
        type = type.toUpperCase()[0] + type.toLowerCase().substring(1,type.length);
        rv = rv.split('=='+type)[1].split('==\n')[1].split('\n==')[0];
        var rvs = rv.split('[[');
        for ( var ro in rvs ) {
          if (rvs[ro].indexOf(']]') !== -1) {
            var rvso = rvs[ro].split(']]')[0].replace(/ /g,'_');
            if (disambiguation.indexOf(rvso) === -1) disambiguation.push(rvso);
          }
        }
      } else if (redirect.indexOf(res.data.query.pages[key].title) === -1) {
        redirect.push(res.data.query.pages[key].title);
      }
      // in the case of a disambiguation page, just disambiguate to the firts option for now...
      url = url.replace(encodeURIComponent(res.data.query.pages[key].title),encodeURIComponent(rv.split('[[')[1].split(']]')[0].replace(/ /g,'_')));
      console.log(url);
      res = Meteor.http.call('GET',url);
      key = undefined;
      for ( var ki in res.data.query.pages ) { if (key === undefined) key = ki; }
    }
    var ret = {status:'success',data:res.data.query.pages[key]};
    if (disambiguation.length) ret.disambiguation = disambiguation;
    if (redirect.length) ret.redirect = redirect;
    return ret;
  } catch(err) {
    return {status:'error',data:err};
  }
}

