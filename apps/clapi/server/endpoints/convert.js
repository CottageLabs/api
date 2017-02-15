
// convert things to other things

CLapi.addRoute('convert', {
  get: {
    action: function() {
      if ( this.queryParams.url) {
        var opts = {};
        if (this.queryParams.subset) opts.subset = this.queryParams.subset;
        if (this.queryParams.start) opts.start = this.queryParams.start;
        if (this.queryParams.end) opts.end = this.queryParams.end;
        if (this.queryParams.fields) opts.fields = this.queryParams.fields.split(',');
        if (this.queryParams.es) opts.es = this.queryParams.es;
        if (this.queryParams.es && this.queryParams.apikey) opts.apikey = this.queryParams.apikey;
        var to = 'text/plain';
        if (this.queryParams.to === 'csv') to = 'text/csv';
        if (this.queryParams.to === 'json') to = 'application/json';
        if (this.queryParams.to === 'xml') to = 'application/xml';
        return {
          statusCode: 200,
          headers: {
            'Content-Type': to
          },
          body: CLapi.internals.convert.run(this.queryParams.url,this.queryParams.from,this.queryParams.to,undefined,opts)
        }
      } else {
        return {status: 'success', data: {info: 'Accepts URLs of content files and converts them. from csv to json,txt. from html to txt. from xml to txt, json. from pdf to txt. from file to txt. For json to csv a subset param can be provided, giving dot notation to the part of the json object that should be converted.'} };
      }
    }
  },
  post: {
    action: function() {
      var opts = {};
      if (this.queryParams.subset) opts.subset = this.queryParams.subset;
      if (this.queryParams.start) opts.start = this.queryParams.start;
      if (this.queryParams.end) opts.end = this.queryParams.end;
      if (this.queryParams.fields) opts.fields = this.queryParams.fields.split(',');
      if (this.queryParams.es) opts.es = this.queryParams.es;
      if (this.queryParams.es && this.queryParams.apikey) opts.apikey = this.queryParams.apikey;
      var to = 'text/plain';
      if (this.queryParams.to === 'csv') to = 'text/csv';
      if (this.queryParams.to === 'json') to = 'application/json';
      if (this.queryParams.to === 'xml') to = 'application/xml';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': to
        },
        body: CLapi.internals.convert.run(undefined,this.queryParams.from,this.queryParams.to,this.request.body,opts)
      }
    }
  }
});



CLapi.internals.convert = {};

CLapi.internals.convert.run = function(url,from,to,content,opts) {
  if (from === undefined && opts.from) from = opts.from;
  if (to === undefined && opts.to) to = opts.to;
  var which, proc, output;
  if ( from === 'table' ) { // convert html table in web page
    if ( to.indexOf('json') !== -1 ) {
      output = CLapi.internals.convert.table2json(url,undefined,opts);
    } else if ( to.indexOf('csv') !== -1 ) {
      output = CLapi.internals.convert.table2csv(url,undefined,opts);      
    }
  } else if ( from === 'csv' ) {
    if ( to.indexOf('json') !== -1 ) {
      url ? output = CLapi.internals.convert.csv2json(url) : CLapi.internals.convert.csv2json(undefined,content);
    } else if ( to.indexOf('txt') !== -1 ) {
      from = 'file';
    }
  } else if ( from === 'html' ) {
    if ( to.indexOf('txt') !== -1 ) {
      output = CLapi.internals.convert.html2txt(url,undefined);
    }
  } else if ( from === 'json' ) {
    if (opts.es) {
      // query local ES action with the given query, which will only work for users with the correct auth
      var user;
      if (opts.apikey) CLapi.internals.accounts.retrieve(opts.apikey);
      var uid = user ? user._id : undefined; // because could be querying a public ES endpoint
      var params = {};
      if (opts.es.indexOf('?') !== -1) {
        var prs = opts.es.split('?')[1];
        var parts = prs.split('&');
        for ( var p in parts ) {
          var kp = parts[p].split('=');
          params[kp[0]] = kp[1];
        }
      }
      opts.es = opts.es.split('?')[0];
      if (opts.es.substring(0,1) === '/') opts.es = opts.es.substring(1,opts.es.length-1);
      var rts = opts.es.split('/');
      content = CLapi.internals.es.action(uid,'GET',rts,params);
      delete opts.es;
      delete opts.apikey;
      url = undefined;
    }
    if ( to.indexOf('csv') !== -1 ) {
      output = CLapi.internals.convert.json2csv(opts,url,content);
    } else if ( to.indexOf('txt') !== -1 ) {
      from = 'file';
    } else if ( to.indexOf('json') !== -1 ) {
      output = CLapi.internals.convert.json2json(opts,url,content);
    }
  } else if ( from === 'xml' ) {
    if ( to.indexOf('txt') !== -1 ) {
      output = CLapi.internals.convert.xml2txt(url,undefined);
    } else if ( to.indexOf('json') !== -1 ) {
      output = CLapi.internals.convert.xml2json(url,undefined);
    }
  }
  if ( from === 'file' || from === 'pdf' ) {
    if ( to.indexOf('txt') !== -1 ) {
      output = CLapi.internals.convert.file2txt(url,undefined,opts);
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

CLapi.internals.convert.table2json = function(url,content,opts) {
  if ( url !== undefined) {
    var res = Meteor.http.call('GET', url);
    content = res.content;
  }
  if ( opts.start ) content = content.split(opts.start)[1];
  if ( content.indexOf('<table') !== -1 ) {
    content = '<table' + content.split('<table')[1];
  } else if ( content.indexOf('<TABLE') !== -1 ) {
    content = '<TABLE' + content.split('<TABLE')[1];      
  }
  if ( opts.end ) content = content.split(opts.end)[0];
  if ( content.indexOf('</table') !== -1 ) {
    content = content.split('</table')[0] + '</table>';
  } else if ( content.indexOf('</TABLE') !== -1 ) {
    content = content.split('</TABLE')[1] + '</TABLE>';
  }
  content = content.replace(/\\n/gi,'');
  var ths = content.match(/<th.*?<\/th/gi);
  var headers = [];
  var results = [];
  for ( var h in ths ) {
    var str = ths[h].replace(/<th.*?>/i,'').replace(/<\/th.*?/i,'');
    str = str.replace(/<.*?>/gi,'').replace(/&nbsp;/gi,'');
    if (str.replace(/ /g,'').length === 0) str = 'UNKNOWN';
    headers.push(str);
  }
  var rows = content.match(/<tr.*?<\/tr/gi);
  for ( var r in rows ) {
    if ( rows[r].toLowerCase().indexOf('<th') === -1 ) {
      var result = {};
      var row = rows[r].replace(/<tr.*?>/i,'').replace(/<\/tr.*?/i,'');
      var vals = row.match(/<td.*?<\/td/gi);
      for ( var d = 0; d < vals.length; d++ ) {
        var keycounter = d;
        if ( vals[d].toLowerCase().indexOf('colspan') !== -1 ) {
          try {
            var count = parseInt(vals[d].toLowerCase().split('colspan')[1].split('>')[0].replace(/[^0-9]/,''));
            keycounter += (count-1);
          } catch(err) {}
        }
        var val = vals[d].replace(/<.*?>/gi,'').replace('</td','');
        if (headers.length > keycounter) {
          result[headers[keycounter]] = val;
        }
      }
      if (result.UNKNOWN !== undefined) delete result.UNKNOWN;
      results.push(result);
    }
  }
  return results;
}

CLapi.internals.convert.table2csv = function(url,content,opts) {
  var d = CLapi.internals.convert.table2json(url,content,opts);
  return CLapi.internals.convert.json2csv(undefined,undefined,d);
}

CLapi.internals.convert.html2txt = function(url,content) {
  // TODO should we use some server-side page rendering here? 
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
  if (opts === undefined) opts = {};
  var from = opts.from !== undefined ? opts.from : 'application/pdf';
  if (opts.from !== undefined) delete opts.from;
  
  if (url !== undefined) {
    // for as yet unknown reasons this does not work when getting a PDF. Tried changing and not changing to buffer, tried converting to string, tried octet-streaming, tried textract.fromUrl, none work.
    var res = Meteor.http.call('GET',url,{npmRequestOptions:{encoding:null}});
    content = new Buffer(res.content);
  }
  textract.fromBufferWithMime(from, content, opts, function( err, result ) {
    return callback(null,result);
  });
});

CLapi.internals.convert.xml2txt = function(url,content) {
  return CLapi.internals.convert.file2txt(url,content,{from:'application/xml'});
}

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

CLapi.internals.convert.json2json = function(opts,url,content) {
  console.log(opts)
  console.log(url)
  if ( url !== undefined ) {
    var res = Meteor.http.call('GET', url);
    content = JSON.parse(res.content);
  }
  if (opts.subset) {
    var parts = opts.subset.split('.');
    for ( var s in parts ) {
      content = content[parts[s]];
    }
  }
  if ( opts.fields ) {
    var recs = [];
    for ( var r in content ) {
      var rec = {};
      for ( var f in opts.fields ) {
        rec[opts.fields[f]] = content[r][opts.fields[f]];
      }
      recs.push(rec);
    }
    content = recs;
  }
  return content;
}


