
CLapi.addRoute('use/exlibris', {
  get: {
    action: function() {
			return {status: 'success', data: {info: 'Provides access to some Exlibris APIs'} };
    }
  }
});

CLapi.addRoute('use/exlibris/primo', {
  get: {
    action: function() {
			return CLapi.internals.use.exlibris.primo(this.queryParams.q,this.queryParams.from,this.queryParams.size,this.queryParams.institution,this.queryParams.url,this.queryParams.raw);
    }
  }
});



// https://developers.exlibrisgroup.com/primo/apis/webservices/gettingstarted
// https://developers.exlibrisgroup.com/primo/apis/webservices/soap/search
// https://developers.exlibrisgroup.com/primo/apis/webservices/xservices/search/briefsearch
// appears to requires identification as a given institution, e.g. as Imperial do:
// Imperial searches require the parameter 'institution=44IMP'.
// http://imp-primo.hosted.exlibrisgroup.com/PrimoWebServices/xservice/search/brief?institution=44IMP&indx=1&bulkSize=10&query=any,contains,science
// http://imp-primo.hosted.exlibrisgroup.com/PrimoWebServices/xservice/search/brief?institution=44IMP&onCampus=true&query=any,exact,lok&indx=1&bulkSize=2&dym=true&highlight=true&lang=eng
// http://imp-primo.hosted.exlibrisgroup.com:80/PrimoWebServices/xservice/search/brief?query=any,contains,cheese&institution=44IMP&onCampus=true&dym=false&indx=1&bulkSize=20&loc=adaptor,primo_central_multiple_fe

// Imperial also said: It appears that usually XServices uses port 1701 for Primo Central results and 80 for Metalib. But for whatever reason ours just uses 80 for
// all of them. You can restrict the search to only Primo Central results by adding the parameter 'loc=adaptor,primo_central_multiple_fe'.


CLapi.internals.use.exlibris = {};

CLapi.internals.use.exlibris.parse = function(rec) {
	//  NOTE there is quite a lot more in here that could be useful...
	var res = {};
	if (rec.LIBRARIES && rec.LIBRARIES.LIBRARY) res.library = rec.LIBRARIES.LIBRARY;
	if (rec.PrimoNMBib && rec.PrimoNMBib.record && rec.PrimoNMBib.record.display) {
		res.title = rec.PrimoNMBib.record.display.title;
		res.type = rec.PrimoNMBib.record.display.type;
		res.publisher = rec.PrimoNMBib.record.display.publisher;
		res.contributor = rec.PrimoNMBib.record.display.contributor;
		res.creator = rec.PrimoNMBib.record.display.creator;
	}
	if (rec.PrimoNMBib && rec.PrimoNMBib.record && rec.PrimoNMBib.record.search) {
		res.subject = rec.PrimoNMBib.record.search.subject;
	}
	if (rec.PrimoNMBib && rec.PrimoNMBib.record && rec.PrimoNMBib.record.links && rec.PrimoNMBib.record.links.linktorsrc) {
		res.repository = rec.PrimoNMBib.record.links.linktorsrc.replace('$$U','');
	}
	return res;
	//return rec;
}

CLapi.internals.use.exlibris.primo = function(qry,from,size,institution,tgt,raw) {
	if (from === undefined) from = 0;
	var index = from + 1;
	if (size === undefined) size = 10;
	var tgt = 'http://imp-primo.hosted.exlibrisgroup.com';
  if (institution === undefined || institution.toLowerCase() === 'imperial') {
  	institution = '44IMP';
  }
  if (['york','44york'].indexOf(institution.toLowerCase()) !== -1) {
  	institution = '44YORK';
  	tgt = 'https://yorsearch.york.ac.uk';
  }
	// TODO add mappings of institutions we want to search on
	var query;
	if ( qry.indexOf(',contains,') !== -1 || qry.indexOf(',exact,') !== -1 || qry.indexOf(',begins_with,') !== -1 || qry.indexOf('&') !== -1 ) {
		query = qry;
	} else if (qry.indexOf(':') !== -1) {
		qry = qry.split(':')[1];
		var within = qry.split(':')[0];
		query = within + ',exact,' + qry;
	} else {
		query = 'any,contains,' + qry;
	}
  var url = tgt + '/PrimoWebServices/xservice/search/brief?json=true&institution=' + institution + '&indx=' + index + '&bulkSize=' + size + '&query=' + query;
  console.log(url);
  //try {
    var res = Meteor.http.call('GET', url);
    console.log(res);
		var data;
    if ( res.statusCode === 200 ) {
			if (raw) {
				try {
					data = res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC;
				} catch(err) {
					data = res.data.SEGMENTS.JAGROOT.RESULT;
				}
			} else {
				data = [];
				try {
					if ( !(res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC instanceof Array) ) res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC = [res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC];
					for ( var r in res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC ) data.push(CLapi.internals.use.exlibris.parse(res.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC[r]));
				} catch(err) {}
			}
			var fcts = [];
			try { fcts = res.data.SEGMENTS.JAGROOT.RESULT.FACETLIST.FACET; } catch (err) {}
			var facets = {};
			for ( var f in fcts ) {
				facets[fcts[f]['@NAME']] = {};
				for ( var fc in fcts[f].FACET_VALUES ) {
					facets[fcts[f]['@NAME']][fcts[f].FACET_VALUES[fc]['@KEY']] = fcts[f].FACET_VALUES[fc]['@VALUE'];
				}
			}
			var total = 0;
			try { total = res.data.SEGMENTS.JAGROOT.RESULT.DOCSET['@TOTALHITS']; } catch(err) {}
      return { status: 'success', query: query, total: total, data: data, facets: facets}
    } else {
      return { status: 'error', data: res}
    }
  /*} catch (err) {
    return { status: 'error', data: err}    
  }*/
}

