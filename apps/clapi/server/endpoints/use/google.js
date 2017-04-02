
// google API stuff
// if we implement a lot of this, could be put into a google/ use subfolder, with separate files for e.g. maps, search etc
// 
// docs:
// https://developers.google.com/places/web-service/autocomplete
// 
// example:
// https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Aberdeen%20Asset%20Management%20PLC&key=<OURKEY>

CLapi.addRoute('use/google', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'A wrap of some google APIs. Just places autocomplete and place lookup for now...'} };      
    }
  }
});

CLapi.addRoute('use/google/places/autocomplete', {
  get: {
    action: function() {
      return CLapi.internals.use.google.places.autocomplete(this.queryParams.q);
    }
  }
});

CLapi.addRoute('use/google/places/place', {
  get: {
    action: function() {
      return CLapi.internals.use.google.places.place(this.queryParams.id,this.queryParams.q);
    }
  }
});

CLapi.addRoute('use/google/places/url', {
  get: {
    action: function() {
      return CLapi.internals.use.google.places.url(this.queryParams.q);
    }
  }
});

CLapi.addRoute('use/google/language', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.use.google.cloud.language(this.queryParams.content,this.queryParams.actions);
    }
  }
});
CLapi.addRoute('use/google/language/sentiment', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.use.google.cloud.language(this.queryParams.content,['sentiment']);
    }
  }
});
CLapi.addRoute('use/google/language/entities', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.use.google.cloud.language(this.queryParams.content,['entities']);
    }
  }
});

CLapi.addRoute('use/google/knowledge/retrieve/:letter/:id', {
  get: {
    roleRequired:'root',
    action: function() {
      // knowledge mids appear to look like /m/0k8z - but is it always m, are they always this format? Assume yes for now
      return CLapi.internals.use.google.knowledge.retrieve('/' + this.urlParams.letter + '/' + this.urlParams.id,this.queryParams.types,this.queryParams.wikidata);
    }
  }
});
CLapi.addRoute('use/google/knowledge/search', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.use.google.knowledge.search(this.queryParams.q,this.queryParams.limit);
    }
  }
});



CLapi.internals.use.google = {};
CLapi.internals.use.google.places = {};
CLapi.internals.use.google.docs = {};
CLapi.internals.use.google.sheets = {};
CLapi.internals.use.google.cloud = {};
CLapi.internals.use.google.knowledge = {};

// https://developers.google.com/knowledge-graph/
// https://developers.google.com/knowledge-graph/reference/rest/v1/
CLapi.internals.use.google.knowledge.retrieve = function(mid,types,wikidata) {
  var u = 'https://kgsearch.googleapis.com/v1/entities:search?key=' + Meteor.settings.GOOGLE_SERVER_KEY + '&limit=1&ids=' + mid;
  if (types) {
    if (typeof types !== 'string') types = types.join('&types='); // are multiple types done by comma separation or key repetition?
    u += '&types=' + types;
  }
  var ret = {}
  try {
    var res = Meteor.http.call('GET',u);
    ret = res.data.itemListElement[0].result;
    ret.score = res.data.itemListElement[0].resultScore;
    if (wikidata) {
      ret.wikidata = CLapi.internals.use.google.knowledge.wikidata(ret["@id"].replace('kg:',''),ret.detailedDescription.url);
    }
  } catch(err) {}
  return ret;
}

CLapi.internals.use.google.knowledge.search = function(qry,limit) {
  if (limit === undefined) limit = 10;
  var u = 'https://kgsearch.googleapis.com/v1/entities:search?key=' + Meteor.settings.GOOGLE_SERVER_KEY + '&limit=' + limit + '&query=' + qry;
  var res = Meteor.http.call('GET',u);
  return res.data;
}

CLapi.internals.use.google.knowledge.wikidata = function(mid,wurl) {
  if (mid && !wurl) {
    var k = CLapi.internals.use.google.knowledge.retrieve(mid);
    if (k.detailedDescription && k.detailedDescription.url) wurl = k.detailedDescription.url
  }
  if (wurl) {
    return CLapi.internals.use.wikidata.find(undefined,wurl);
  }
}

// https://cloud.google.com/natural-language/docs/getting-started
// https://cloud.google.com/natural-language/docs/basics
CLapi.internals.use.google.cloud.language = function(content,actions,auth) {
  if (typeof actions === 'string') {
    actions = actions.split(',');
  } else if (actions === undefined) {
    actions = ['entities','sentiment']
  }
  // worth passing a url to get content from? or setting entities/sentiment on/off?
  if (content === undefined || !content.length) return {};
  if (auth === undefined) auth = {
    projectId: Meteor.settings.GOOGLE_PROJECT_ID,
    credentials: Meteor.settings.GOOGLE_CREDENTIALS
  };
  var language = Meteor.npmRequire('@google-cloud/language');
  var client = language(auth);
  var document = client.document(content);
  var res = {};

  var entities = Async.wrap(function(content,callback) {
    document.detectEntities(content, function(err, result) {
      return callback(null,result);
    });
  });
  if (actions.indexOf('entities') !== -1) res.entities = entities(content);
  
  var sentiment = Async.wrap(function(content,callback) {
    document.detectSentiment(content, function(err, result) {
      return callback(null,result);
    });
  });
  if (actions.indexOf('sentiment') !== -1) res.sentiment = sentiment(content);
  
  return res;
}

CLapi.internals.use.google.places.autocomplete = function(qry) {
  console.log('Using google places autocomplete to query ' + qry);
  var url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' + qry + '&key=' + Meteor.settings.GOOGLE_SERVER_KEY;
  try {
    return Meteor.http.call('GET',url).data;
  } catch(err) {
    return {status:'error'}
  }// meteor http call get will throw error on 404
}

CLapi.internals.use.google.places.place = function(id,qry) {
  console.log('Using google places place lookup on ' + id + ' ' + qry);
  if ( id === undefined ) {
    try {
      var results = CLapi.internals.use.google.places.autocomplete(qry);
      id = results.predictions[0].place_id;
    } catch(err) {
      return {status:'error'}
    }
  }
  var url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid=' + id + '&key=' + Meteor.settings.GOOGLE_SERVER_KEY;
  try {
    return Meteor.http.call('GET',url).data;
  } catch(err) {
    return {status:'error'}
  }// meteor http call get will throw error on 404
}

CLapi.internals.use.google.places.url = function(qry) {
  console.log('Using google places url wrap for ' + qry);
  try {
    var results = CLapi.internals.use.google.places.place(undefined,qry);
    return {status:'success',data: {url:results.result.website.replace('://','______').split('/')[0].replace('______','://')}}
  } catch (err) {
    return {status:'error'}
  }
}

CLapi.internals.use.google.sheets.feed = function(sheetid,stale) {
  // expects a google sheet ID or a URL to a google sheets feed in json format
  // NOTE the sheed must be published for this to work, should have the data in sheet 1, and should have columns of data with key names in row 1
  var url;
  if (sheetid.indexOf('http') !== 0) {
    url = 'https://spreadsheets.google.com/feeds/list/' + sheetid + '/od6/public/values?alt=json';
  } else {
    url = sheetid;
    sheetid = sheetid.replace('https://','').replace('http://','').replace('spreadsheets.google.com/feeds/list/','').split('/')[0];
  }
  var localcopy = '.googlelocalcopy' + sheetid + '.json';
  var fs = Meteor.npmRequire('fs');
  if (stale === undefined) stale = 3600000;
  var values = [];
  if ( fs.existsSync(localcopy) && ( (new Date()) - fs.statSync(localcopy).mtime) < stale ) {
    console.log('Data retrieved for ' + url + ' from local copy ' + localcopy);
    values = JSON.parse(fs.readFileSync(localcopy));
  } else {
    console.log('Getting data from google doc for ' + url);
    try {
      var g = Meteor.http.call('GET',url);
      var list = g.data.feed.entry;
      for ( var l in list ) {
        var val = {};
        for ( var k in list[l] ) {
          if (k.indexOf('gsx$') === 0) val[k.replace('gsx$','')] = list[l][k].$t;
        }
        values.push(val);
      }
    } catch(err) {
      console.log('Could not get any values from sheet ' + url);
      console.log(err)
    }
    fs.writeFileSync(localcopy, JSON.stringify(values));
  }
  return values;
}


