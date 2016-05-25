
// get some data, post it somewhere else
// and don't use the stupid Meteor http post that does not appear to be able to do anything but json...

CLapi.internals.post = function(url,pkg,type,opts) {
  console.log('starting post');
  if (opts === undefined) opts = {headers:{}}
  if (type === undefined) type = 'text/plain';
/*  var post = function(callback) {
    console.log('in async post');*/
    var s;
    if (type === 'text/plain') {
      var stream = Npm.require('stream');
      s = new stream.Readable();
      //s._read = function noop() {};
      s.push(pkg);
      s.push(null);
    } else {
      s = pkg;
    }
    var request = Meteor.npmRequire('request');
    if (opts.headers['Content-Type'] === undefined) opts.headers['Content-Type'] = type;
    //if (opts.headers['Content-Length'] === undefined) opts.headers['Content-Length'] = Buffer.byteLength(s);
    s.pipe(
      request.post(url, opts, function (err, res, body) {
        if ( res === undefined ) {
          //callback(null, err);
        } else {
          console.log('calling back post');
          //callback(null, res);        
        }
      })
    );
/*  };
  var apost = Async.wrap(post);
  var ret = apost();
  console.log('posted to ' + url + ' with response ' + ret);
  return ret;*/
}