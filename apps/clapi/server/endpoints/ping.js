
// craft an img link and put it in an email, if the email is viewed as html it will load the URL of the img, 
// which actually hits this route, and allows us to record stuff about the event

// so for example for oabutton where this was first created for, an image url like this could be created, 
// with whatever params are required to be saved, in addition to the nonce.
// On receipt the pinger will grab IP and try to retrieve location data from that too:
// <img src="https://api.cottagelabs.com/ping/p.png?n=<CURRENTNONCE>service=oabutton&id=<USERID>">

pings = new Mongo.Collection("pings");
CLapi.addCollection(pings);

CLapi.addRoute('ping', {
  get: {
    action: function() {
      return {status: 'success', data: 'A pinger...'}
    }
  }
});

CLapi.addRoute('ping/p.png', {
  get: {
    action: function() {
      if (this.queryParams.n === Meteor.settings.ping.nonce) {
        // if the query params ping nonce is present, save stuff (except the nonce)
        // store the query param data
        var data = this.queryParams;
        delete data.n;
        data.ip = this.request.headers['x-real-ip'];
        data.forwarded = this.request.headers['x-forwarded-for'];
        try {
          var res = Meteor.http.call('GET','http://ipinfo.io/' + data.ip);
          var info = JSON.parse(res.content);
          for ( var k in info ) data[k] = info[k];
          if ( data.loc ) {
            try {
              var latlon = data.loc.split(',');
              data.lat = latlon[0];
              data.lon = latlon[1];
            } catch(err) {}
          }
        } catch(err) {}
        CLapi.internals.ping.receive(data);
      }
      // return a 1px transparent image
      // here is a red one for testing - it comes out very small on the top left of the browser screen
      //var img = new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8BQDwAEgAF/posBPQAAAABJRU5ErkJggg==', 'base64');
      var img = new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');
      this.response.writeHead(200, {
        'Content-disposition': "inline; filename=p.png",
        'Content-type': 'image/png',
        'Content-length': img.length
      });        
      this.response.write(img);
      this.done();
      return {};
    }
  }
});

CLapi.internals.ping = {};
CLapi.internals.ping.receive = function(data) {
  // store the data that we received - whatever the person creating the img link chose to put on the query params in their img link
  console.log('Storing ping data ' + JSON.stringify(data));
  return pings.insert(data);
}


