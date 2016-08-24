
// convert things to other things

CLapi.addRoute('convert', {
  get: {
    action: function() {
      if ( this.queryParams.url) {
        var opts = {
          subset:this.queryParams.subset
        };
        if (this.queryParams.fields) opts.fields = this.queryParams.fields.split(',');
        var to = 'text/plain';
        if (this.queryParams.to === 'csv') to = 'text/csv';
        if (this.queryParams.to === 'json') to = 'application/json';
        if (this.queryParams.to === 'xml') to = 'text/xml';
        return {
          statusCode: 200,
          headers: {
            'Content-Type': to
          },
          body: CLapi.internals.convert.run(this.queryParams.url,this.queryParams.from,this.queryParams.to,undefined,opts)
        }
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


CLapi.internals.convert.run = function(url,from,to,content,opts) {
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
      output = CLapi.internals.convert.xml2txt(url,undefined,html);
    } else if ( to === 'json' ) {
      output = CLapi.internals.convert.xml2json(url,undefined);
    }
  } else if ( from === 'json' ) {
    if ( to === 'csv' ) {
      output = CLapi.internals.convert.json2csv(opts,url,content); // pass extra opts here if available
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
  if ( url !== undefined) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  var html2txt = Meteor.npmRequire('html-to-text');
  var text = html2txt.fromString(content, {wordwrap: 130});
  return text;
};

CLapi.internals.convert.file2txt = Async.wrap(function(url, content, opts, callback) {
  var textract = Meteor.npmRequire('textract');
  // NOTE extracting pdf requires pdftotext to be installed on the machine
  // https://www.npmjs.com/package/textract
  // http://www.foolabs.com/xpdf/download.html
  // or may be better off just using pdf2json https://www.npmjs.com/package/pdf2json
  // if we have content rather than url do this a different way...
  if (url) {
    textract.fromUrl(url, opts, function( err, result ) {
      return callback(null,result);
    });
  } else {
    textract.fromBufferWithMime('application/pdf',content, opts, function( err, result ) {
      return callback(null,result);
    });
  }
});

CLapi.internals.convert.xml2json = Async.wrap(function(url, content, callback) {
  if ( url !== undefined ) {
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
  if ( url !== undefined ) {
    var res = Meteor.http.call('GET', url);
    content = JSON.parse(res.content);
  }
  if (opts === undefined) opts = {};
  if (opts.subset) {
    var parts = opts.subset.split('.');
    delete opts.subset;
    for ( var p in parts ) {
      if (Array.isArray(content)) {
        var c = [];
        for ( var r in content ) c.push(content[r][parts[p]]);
        content = c;
      } else  {
        content = content[parts[p]];
      }
    }
  }
  opts.data = content;
  var json2csv = Meteor.npmRequire('json2csv');
  json2csv(opts, function(err, result) {
    if (result) result = result.replace(/\\r\\n/g,'\r\n');
    return callback(null,result);
  });
});

