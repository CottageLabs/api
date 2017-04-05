
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
        body: CLapi.internals.phantom.get(this.queryParams.url,this.queryParams.delay)
      };
    }
  }
});

CLapi.internals.phantom = {};

// return the content of the page at the redirected URL, after js has run
var _phantom = function(url,delay,callback) {
  if (url.indexOf('http') === -1) url = 'http://' + url;
  if (delay === undefined) delay = 5000;
  var phi,sp;
  var phantom = Meteor.npmRequire('phantom');
  var fs = Meteor.npmRequire('fs');
  console.log('starting phantom retrieval of ' + url);
  var ppath = '/usr/bin/phantomjs';
  var redirector = undefined;
  if (!fs.existsSync(ppath)) ppath = '/usr/local/bin/phantomjs';
  phantom.create(['--ignore-ssl-errors=yes','--load-images=no','--cookies-file=./cookies.txt'],{phantomPath:ppath})
    .then(function(ph) {
      phi = ph;
      console.log('creating page');
      return phi.createPage();
    })
    .then(function(page) {
      sp = page;
      sp.setting('resourceTimeout',3000);
      sp.setting('loadImages',false);
      sp.setting('userAgent','Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36');
      console.log('retrieving page');
      sp.onResourceReceived = function(resource) {
        if (url == resource.url && resource.redirectURL) {
          redirector = resource.redirectURL;
        }
      }
      return sp.open(url);
    })
    .then(function(status) {
      if (redirector) {
        console.log('redirecting to ' + redirector);
        sp.close();
        phi.exit();
        _phantom(redirector,delay,callback);
      } else {
        console.log('retrieving content');
        var Future = Npm.require('fibers/future');
        var future = new Future();
        setTimeout(function() { future.return(); }, delay);
        future.wait();
        return sp.property('content');
      }
    })
    .then(function(content) {
      console.log(content.length);
      if (content.length < 200 && delay < 10000 ) {
        delay += 5000;
        sp.close();
        phi.exit();
        redirector = undefined;
        console.log('trying again with delay ' + delay);
        _phantom(url,delay,callback);
      } else {
        console.log('got content');
        sp.close();
        phi.exit();
        redirector = undefined;
        return callback(null,content);
      }
    })
    .catch(function(error) {
      console.log('phantom errored');
      console.log(error);
      sp.close();
      phi.exit();
      redirector = undefined;
      return callback(null,'');
    });
    
}
CLapi.internals.phantom.get = Async.wrap(_phantom);




