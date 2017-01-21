
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
			return CLapi.internals.use.exlibris.primo(this.queryParams.q,this.queryParams.from,this.queryParams.size);
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
	var res = {};
	return res;
}

CLapi.internals.use.exlibris.primo = function(qry,from,size,institution) {
	// TODO looks like IP registration is required to use this, so ask Imperial for that and then route queries through my main machine proxy so they come from the registered IP (same as BASE)
	// oddly, it works from a home ISP addr on virgin media but not on servers, although their docs do say IP reg is required so it is more odd that it worked at all
	if (from === undefined) from = 0;
	var index = from + 1;
	if (size === undefined) size = 10;	
  if (institution === undefined) institution = '44IMP';
	var query = 'any,contains,' + qry; // TODO how to build a query they will accept
  var url = 'http://imp-primo.hosted.exlibrisgroup.com/PrimoWebServices/xservice/search/brief?json=true&institution=' + institution + '&indx=' + index + '&bulkSize=' + size + '&query=' + query;
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      var data = [];
      //for ( var r in js.OpenDOAR.repositories[0].repository ) data.push(CLapi.internals.use.opendoar.parse(js.OpenDOAR.repositories[0].repository[r])); 
      return { status: 'success', total: '', data: res.data} // or may need to JSON.parse res.content depending how the data identifies
    } else {
      return { status: 'error', data: res}
    }
  } catch (err) {
    return { status: 'error', data: err}    
  }
}

