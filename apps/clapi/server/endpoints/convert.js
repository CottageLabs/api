
// convert things to other things

CLapi.addRoute('convert', {
  get: {
    action: function() {
      if ( this.queryParams.url) {
        return CLapi.internals.convert.run(this.queryParams.url,this.queryParams.from,this.queryParams.to);        
      } else {
        return {status: 'success', data: {info: 'Accepts URLs of content files and converts them to what you need'} };
      }
    }
  },
  post: {
    action: function() {
      if ( this.request.json && this.request.json.url) {
        return CLapi.internals.convert.run(this.request.json.url,this.request.json.from,this.request.json.to);
      } else {
        return CLapi.internals.convert.run(undefined,this.queryParams.from,this.queryParams.to,this.request.body);        
      }
    }
  }
});


CLapi.internals.convert.run = function(url,from,to,content) {
  var which, proc, output;
  if ( from === 'csv' ) {
    if ( to === 'json' ) {
      url ? output = CLapi.internals.convert.csv2json(url) : CLapi.internals.convert.csv2json(undefined,content);
    } else if ( to === 'txt' ) {
      from = 'file';
    }
  } else if ( from === 'html' || from === 'xml' ) {
    if ( to === 'txt' ) {
      var html = false;
      if ( from === 'html' ) html = true;
      output = CLapi.internals.convert.xml2txt(url,html);
    } else if ( to === 'json' ) {
      output = CLapi.internals.convert.xml2json(url);
    }
  } else if ( from === 'json' ) {
    if ( to === 'csv' ) {
      output = CLapi.internals.convert.json2csv(url); // pass extra opts here if available
    } else if ( to === 'txt' ) {
      from = 'file';
    }
  }
  if ( from === 'file' || from === 'pdf' ) {
    if ( to === 'txt' ) {
      output = CLapi.internals.convert.file2txt(url);
    }    
  }
  if ( output === undefined ) {
    return {status: 'error', data: 'conversion from ' + from + ' to ' + to + ' is not currently possible.'}
  } else {
    return output;
  }
}


var _csv2json = function(url,content,callback) {
  console.log('starting csv2json for url ' + url);
  if (content) console.log(' with provided content');
  var request = Meteor.npmRequire("request");
  var Converter = Meteor.npmRequire("csvtojson").Converter;
  var converter;
  if ( content === undefined ) {
    converter = new Converter({constructResult:false});
    var recs = [];
    converter.on("record_parsed", function (row) {
      recs.push(row);
    });
    request.get(url).pipe(converter);
    return recs; // this probably needs to be on end of data stream
  } else {
    converter = new Converter({});
    converter.fromString(content,function(err,result) {
      return callback(null,result);
    });
  }
}
CLapi.internals.convert.csv2json = Async.wrap(_csv2json);


CLapi.internals.convert.xml2txt = function(url,content,html) {
  // TODO if it is html should we use some server-side page rendering here? 
  // such as phantomjs, to get text content before rendering to text?
  if ( content === undefined) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  var html2txt = Meteor.npmRequire('html-to-text');
  var text = html2txt.fromString(content, {wordwrap: 130});
  return text;
};

CLapi.internals.convert.file2txt = Async.wrap(function(url, content, callback) {
  var textract = Meteor.npmRequire('textract');
  // if we have content rather than url do this a different way...
  textract.fromUrl(url, function( err, result ) {
    return callback(null,result);
  });
});

CLapi.internals.convert.xml2json = Async.wrap(function(url, content, callback) {
  if ( content === undefined ) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  var xml2js = Meteor.npmRequire('xml2js'); // check if this works straight from url
  var parser = new xml2js.Parser();
  parser.parseString(content, function (err, result) {
    return callback(null,result);
  });
});

CLapi.internals.convert.json2csv = Async.wrap(function(opts, url, content, callback) {
  if ( content === undefined ) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  if (opts === undefined) opts = {};
  opts.data = content;
  var json2csv = Meteor.npmRequire('json2csv');
  json2csv(opts, function(err, result) {
    if (result) result = result.replace(/\\r\\n/g,'\r\n');
    return callback(null,result);
  });
});

/*CLapi.internals.convert.json2csv = function(url,content,separation,encapsulation,into,keys) {
  if ( content === undefined ) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  var c;
  into ? c = content[into] : c = content; //what if into is dot notation further depth
  if ( separation === undefined ) separation = ',';
  if ( encapsulation === undefined ) encapsulation = '"';
  // expect a list of objects
  if ( !(Array.isArray(json)) ) return {status: 'error', data: 'incoming data must be a list of objects'}
  if (keys === undefined) {
    keys = [];
    for ( var i in json ) {
      for ( var k in json[i] ) {
        if ( keys.indexOf(k) === -1 ) keys.push(k);
      }
    }
  }
  var out = '';
  for ( var f in keys ) {
    if ( f !== 0) out += separation;
    out += encapsulation + keys[f] + encapsulation;
  }
  for ( var n in json ) {
    var row = json[n];
    if ( n !== 0 ) out += '\n';
    for ( var ky in keys ) {
      if ( ky !== 0) out += separation;
      var val = row[ky];
      if (Array.isArray(val)) val = val.join(',');
      // probelm here because would create values with the standard separator in them
      // assume for now this is pre-handled
      //if ( typeof val === 'object' ) val = JSON.stringify(val);
      out += encapsulation + val + encapsulation;
    }
  }
  return out;
};
*/