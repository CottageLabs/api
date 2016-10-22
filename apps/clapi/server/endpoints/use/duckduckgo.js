
// duckduckgo instant answers API
// docs:
// https://duckduckgo.com/api
// 
// example:
// http://api.duckduckgo.com/?q=abcam&format=json

// looks like duckduckgo block multiple requests from backend servers, as they said they might

CLapi.addRoute('use/duckduckgo', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'A wrap of the duckduckgo API - it works, but they DO block. Not sure what counts as blockable usage yet...'} };      
    }
  }
});

CLapi.addRoute('use/duckduckgo/instants', {
  get: {
    action: function() {
      return CLapi.internals.use.duckduckgo.instants(this.queryParams.q);
    }
  }
});



CLapi.internals.use.duckduckgo = {};

CLapi.internals.use.duckduckgo.instants = function(qry) {
  console.log('Using duckduckgo to query ' + qry);
  var url = 'http://api.duckduckgo.com/?q=' + qry + '&format=json&t=cltest';
  try {
    return Meteor.http.call('GET',url).data;
  } catch(err) {
    return {status:'error'}
  }// meteor http call get will throw error on 404
}


