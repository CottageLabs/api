
// sherpa romeo API user

// has an api key set in settings and should be appended as query param "ak"

// docs http://www.sherpa.ac.uk/romeo/apimanual.php?la=en&fIDnum=|&mode=simple

//  A romeo query for an issn is what is immediately required: 
// http://www.sherpa.ac.uk/romeo/api29.php?issn=1444-1586

// returns an object in which <romeoapi version="2.9.9"><journals><journal> confirms the journal
// and <romeoapi version="2.9.9"><publishers><publisher><romeocolour> gives the romeo colour
// (interestingly Elsevier is green...)

// it is an xml only api so need xml2js
// https://www.npmjs.com/package/xml2js


CLapi.addRoute('use/sherpa', {
  get: {
    action: function() {
      var routes = [];
      for ( var k in CLapi.internals.use.sherpa ) routes.push(k);
      return {status: 'success', routes: routes, data: {info: 'returns responses from the Sherpa API.'} };
    }
  }
});

CLapi.addRoute('use/sherpa/romeo', {
  get: {
    action: function() {
			var routes = [];
			for ( var k in CLapi.internals.use.sherpa.romeo ) routes.push(k);
			return {status: 'success', data: {info: 'returns responses from Sherpa Romeo.'} };
    }
  }
});

CLapi.addRoute('use/sherpa/romeo/search', {
  get: {
    action: function() {
			if ( Object.keys(this.queryParams).length !== 0 ) {
				return CLapi.internals.use.sherpa.romeo.search(this.queryParams);
			} else {
				return {status: 'success', data: {info: 'Append your query to this url. For example ?issn=1444-1586'} };
			}
    }
  }
});

CLapi.addRoute('use/sherpa/romeo/colour', {
  get: {
    action: function() {
			return {status: 'success', data: {info: 'Append an issn to this URL to get back the Romeo colour. e.g. /1444-1586'} };
    }
  }
});

CLapi.addRoute('use/sherpa/romeo/colour/:issn', {
  get: {
    action: function() {
			return CLapi.internals.use.sherpa.romeo.colour(this.urlParams.issn);
    }
  }
});


CLapi.internals.use.sherpa = {romeo:{}};

CLapi.internals.use.sherpa.romeo.search = function(qryparams) {
  // assume incoming query string matches what sherpa romeo can accept
	// does not seem to do paging either...
  var apikey = Meteor.settings.ROMEO_apikey;
  if ( !apikey ) return { status: 'error', data: 'NO ROMEO API KEY PRESENT!'}
	var url = 'http://www.sherpa.ac.uk/romeo/api29.php?ak=' + apikey + '&';
	for ( var q in qryparams ) url += q + '=' + qryparams[q] + '&';
  console.log(url);
  var res = Meteor.http.call('GET', url);
	var result = CLapi.internals.convert.xml2json(res.content);
	if ( res.statusCode === 200 ) {
		return { status: 'success', data: {journals: result.romeoapi.journals, publishers: result.romeoapi.publishers}}
	} else {
		return { status: 'error', data: result}
	}		
}

CLapi.internals.use.sherpa.romeo.colour = function(issn) {
	var resp = CLapi.internals.use.sherpa.romeo.search({issn:issn});
	try {
		return { status: 'success', data: resp.data.publishers[0].publisher[0].romeocolour[0]}
	} catch(err) {
		return { status: 'error', data: resp}
	}
}

