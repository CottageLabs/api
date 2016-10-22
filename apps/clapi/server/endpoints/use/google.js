
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




