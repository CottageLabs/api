
// convert xml to js, simply

CLapi.addRoute('convert/xml2json', {
  get: {
    action: function() {
			if ( this.queryParams.url ) {
				return CLapi.internals.convert.url4xml2json(this.queryParams.url);
			} else {
	      return {status: 'success', data: {info: 'Converts incoming xml or xml at a URL to json. Submit url as "url" query param to this endpoint. \
					Soon also POST your xml right here - but not yet - stub in progress'} };
			}
    }
  }
});

CLapi.internals.convert.url4xml2json = function(url) {
  var res = Meteor.http.call('GET', url);
	return CLapi.internals.convert.xml2json(res.content);
}

CLapi.internals.convert.xml2json = function(xml) {
  var translate = function(data, callback) {
    var xml2js = Meteor.npmRequire('xml2js');
    var parser = new xml2js.Parser();
    parser.parseString(data, function (err, result) {
      return callback(null,result);
    });
  };
  var atranslate = Async.wrap(translate);
	var js = atranslate(xml);
  return js;
}


// can xml2js be done simply?
/*var xml2js = Meteor.npmRequire('xml2js');
var parser = new xml2js.Parser();
var apires = '<root>Hello xml2js!</root>'; // stuff back from sherpa romeo API
var js = parser.parseString(apires);
console.log(js);*/

/*
var translate = function(fn, callback) {
	console.log('translating ' + fn);
	var parser = new xml2js.Parser();
	fs.readFile(fn, function(err, data) {
		parser.parseString(data, function (err, result) {
			var res = [];
			var results = result.results.result;
			if ( results === undefined ) { results = []; }
			for ( var r in results ) {
				var rs = results[r]['$'];
				if ( rs !== undefined ) {
					if ( !('fact' in rs) ) {
						if ( 'match' in rs ) {
							rs.fact = rs.match;
						} else if ( 'exact' in rs ) {
							rs.fact = rs.exact;
						} else if ( 'value0' in rs ) {
							rs.fact = rs.value0;
						} else {
							rs.fact = '';
						}
					}
					res.push(rs);
				}
			}
			return callback(null,res);
		});
	});	
};
var atranslate = Async.wrap(translate);
*/