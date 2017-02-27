// oabutton wants to use SHARE to find research articles
// https://github.com/OAButton/backend/issues/112

// https://share.osf.io/api/v2/search/abstractcreativework/_search

CLapi.addRoute('use/share', {
  get: {
    action: function() {
      return {status: 'success', routes: routes, data: {info: 'returns responses from the SHARE API.'} };
    }
  }
});

CLapi.addRoute('use/share/search', {
  get: {
    action: function() {
      return CLapi.internals.use.share.search(this.queryParams);
    }
  }
});

CLapi.addRoute('use/share/doi/:doipre/:doipost', {
  get: {
    action: function() {
      return CLapi.internals.use.share.doi(this.urlParams.doipre + '/' + this.urlParams.doipost,this.queryParams.open);
    }
  }
});



CLapi.internals.use.share = {};

// list of sources that Share gets from:
// https://share.osf.io/api/v2/search/creativeworks/_search?&source=%7B%22query%22%3A%7B%22filtered%22%3A%7B%22query%22%3A%7B%22bool%22%3A%7B%22must%22%3A%5B%7B%22match_all%22%3A%7B%7D%7D%5D%7D%7D%7D%7D%2C%22from%22%3A0%2C%22size%22%3A0%2C%22aggs%22%3A%7B%22sources%22%3A%7B%22terms%22%3A%7B%22field%22%3A%22sources%22%2C%22size%22%3A200%7D%7D%7D%7D

CLapi.internals.use.share.doi = function(doi,open) {
  var res = CLapi.internals.use.share.search({q:'identifiers:"' + doi.replace('/','\/') + '"'});
  if (res.total > 0) {
    var rec = !open || ( open && CLapi.internals.use.share.open(res.data[0]) ) ? res.data[0] : undefined;
    return {status:'success', data: rec};
  } else {
    return {};
  }
}

CLapi.internals.use.share.search = function(params) {
  var url = 'https://share.osf.io/api/v2/search/creativeworks/_search';
  if (params) {
    url += '?';
    for ( var op in params ) url += op + '=' + params[op] + '&';
  }
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url, {headers:{'Content-Type':'application/json'}});
    if ( res.statusCode === 200 ) {
      var ret = [];
      for ( var r in res.data.hits.hits ) ret.push(res.data.hits.hits[r]._source);
      return { status: 'success', total: res.data.hits.total, data: ret}
    } else {
      return { status: 'error', data: res}
    }
  } catch(err) {
    return { status: 'error', data: 'SHARE API error'}
  }

}

CLapi.internals.use.share.open = function(record) {
  // get the list of sources we consider open, from the google spreadsheet, if not already available locally
  var sheet = CLapi.internals.use.google.sheets.feed(Meteor.settings.openaccessbutton.share_sources_sheetid);
  var sources = [];
  for ( var i in sheet ) sources.push(sheet[i].name.toLowerCase());
  var open = false;
  for ( var s in record.sources ) {
    if (sources.indexOf(record.sources[s]) !== -1) {
      var u, d;
      for ( var id in record.identifiers) {
        if (record.identifiers[id].indexOf('http') === 0) {
          if (record.identifiers[id].indexOf('doi.org') === -1) {
            if (!CLapi.internals.service.oab.blacklist(u)) u = record.identifiers[id];
          } else if (d === undefined) {
            d = record.identifiers[id];
          }
        }
      }
      if (!u && d) u = d;
      if (u) {
        open = u;
        break;
      }
    }
  }
  return open;
}




