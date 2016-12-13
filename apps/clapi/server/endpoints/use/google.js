
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



CLapi.internals.use.google = {};
CLapi.internals.use.google.places = {};
CLapi.internals.use.google.docs = {};
CLapi.internals.use.google.sheets = {};

CLapi.internals.use.google.places.autocomplete = function(qry) {
  console.log('Using google places autocomplete to query ' + qry);
  var url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' + qry + '&key=' + Meteor.settings.GOOGLE_MAPS_KEY;
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
  var url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid=' + id + '&key=' + Meteor.settings.GOOGLE_MAPS_KEY;
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
    }
    fs.writeFileSync(localcopy, JSON.stringify(values));
  }
  return values;
}


