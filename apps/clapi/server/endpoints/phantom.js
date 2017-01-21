
CLapi.addRoute('phantom', {
  get: {
    action: function() {
      return {status:'success',data:'use phantom in various ways to render a page - for now, just get a rendered page back at phantom/get'}
    }
  }  
});

CLapi.addRoute('phantom/get', {
  get: {
    action: function() {
      var format = this.queryParams.format ? this.queryParams.format : 'plain';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/' + format
        },
        body: CLapi.internals.academic.phantom(this.queryParams.url,this.queryParams.delay)
      };
    }
  }
});

CLapi.internals.phantom = {};

// return the content of the page at the redirected URL, after js has run
var _phantom = function(url,delay,callback) {
  if (url.indexOf('http') === -1) url = 'http://' + url;
  if (delay === undefined) delay = 2000;
  var phi,sp;
  var phantom = Meteor.npmRequire('phantom');
  var fs = Meteor.npmRequire('fs');
  console.log('starting phantom retrieval of ' + url);
  var ppath = '/usr/bin/phantomjs';
  if (!fs.existsSync(ppath)) ppath = '/usr/local/bin/phantomjs';
  phantom.create([],{phantomPath:ppath})
    .then(function(ph) {
      phi = ph;
      console.log('creating page');
      return phi.createPage();
    })
    .then(function(page) {
      sp = page;
      sp.setting('resourceTimeout',5000);
      console.log('retrieving page');
      return sp.open(url);
    })
    .then(function(status) {
      console.log('retrieving content');
      var Future = Npm.require('fibers/future');
      var future = new Future();
      setTimeout(function() { future.return(); }, delay);
      future.wait();
      return sp.property('content');
    })
    .then(function(content) {
      console.log('got content');
      sp.close();
      phi.exit();
      return callback(null,content);
    })
    .catch(function(error) {
      console.log('phantom errored');
      console.log(error);
      sp.close();
      phi.exit();
      return callback(null,'');
    });
    
}
CLapi.internals.phantom.get = Async.wrap(_phantom);




