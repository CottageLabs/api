
// pubmed API http://www.ncbi.nlm.nih.gov/books/NBK25497/
// examples http://www.ncbi.nlm.nih.gov/books/NBK25498/#chapter3.ESearch__ESummaryEFetch
// get a pmid - need first to issue a query to get some IDs...
// http://eutils.ncbi.nlm.nih.gov/entrez/eutils/epost.fcgi?id=21999661&db=pubmed
// then scrape the QueryKey and WebEnv values from it and use like so:
// http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&query_key=1&WebEnv=NCID_1_54953983_165.112.9.28_9001_1461227951_1012752855_0MetA0_S_MegaStore_F_1

CLapi.addRoute('use/pubmed', {
  get: {
    action: function() {
      var routes = [];
      return {status: 'success', data: {info: 'returns a subset of the pubmed API functionality'} };
    }
  }
});

CLapi.addRoute('use/pubmed/:pmid', {
  get: {
    action: function() {
      return CLapi.internals.use.pubmed.pmid(this.urlParams.pmid);
    }
  }
});

CLapi.internals.use.pubmed = {};

CLapi.internals.use.pubmed.pmid = function(pmid) {
  var baseurl = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  var urlone = baseurl + 'epost.fcgi?db=pubmed&id=' + pmid;
  try {
    console.log('pubmed API GET to ' + urlone);
    var res = Meteor.http.call('GET',urlone);
  	var result = CLapi.internals.convert.xml2json(undefined,res.content);
    var querykey = result.ePostResult.QueryKey[0];
    var webenv = result.ePostResult.WebEnv[0];
    var urltwo = baseurl + 'esummary.fcgi?db=pubmed&query_key=' + querykey + '&WebEnv=' + webenv;
    console.log('following pubmed API GET to ' + urltwo);
    var restwo = Meteor.http.call('GET',urltwo);
    var md = CLapi.internals.convert.xml2json(undefined,restwo.content);
    var rec = md.eSummaryResult.DocSum[0];
    var frec = {id:rec.Id[0]};
    for ( var i in rec.Item ) {
      var ii = rec.Item[i];
      if ( ii.$.Type === 'List' ) {
        frec[ii.$.Name] = [];
        for ( var si in ii.Item) {
          var sio = {};
          sio[ii.Item[si].$.Name] = ii.Item[si]._;
          frec[ii.$.Name].push(sio);
        }
      } else {
        frec[ii.$.Name] = ii._;
      }
    }
    return {status: 'success', data:frec}
  } catch(err) {
    return {status:'error'}
  }
}

CLapi.internals.use.pubmed.aheadofprint = function(pmid) {
  var pubmed_xml_url = 'http://www.ncbi.nlm.nih.gov/pubmed/' + pmid + '?report=xml';
  console.log('pubmed web UI GET to ' + pubmed_xml_url);
  var res = Meteor.http.call('GET', pubmed_xml_url);
  if (res.content !== undefined) {
    // if "aheadofprint" is present here, then the article is an Ahead of Print article
    var aheadofprint = res.content.indexOf('PublicationStatus&gt;aheadofprint&lt;/PublicationStatus') !== -1;
  }
  return aheadofprint;
}




