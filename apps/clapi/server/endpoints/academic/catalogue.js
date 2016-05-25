
// academic catalogue

// this is really just an overlay to an es endpoint on the catalogue
// but should it be on our machine or on cambridge?

CLapi.addRoute('academic/catalogue', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'query an academic catalogue'} };
    }
  }
});

CLapi.addRoute('academic/catalogue/:dates', {
  get: {
    action: function() {
      var dates = this.queryParams.dates.split('-');
      var d1 = dates[0];
      var d2 = dates.length === 2 ? dates[1] : undefined;
      return {status: 'success', data: 'query on these dates?' };
    }
  }
});

CLapi.addRoute('academic/catalogue/query', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a list of every academic article indexed on a given date, when date is appended to this URL in the form YYYYMMDD. Sources are crossref and europepmc so far'} };
    }
  }
});

CLapi.addRoute('academic/daily/retrieve/:date', {
  get: {
    authRequired: true,
    roleRequired:'root',
    action: function() {
      var sources;
      if (this.queryParams.sources) sources = this.queryParams.sources.split(',');
      return CLapi.internals.academic.catalogue.daily(this.urlParams.date,this.queryParams.refresh,this.queryParams.resolve,sources);
    }
  }
});

CLapi.internals.academic.catalogue = {}

CLapi.internals.academic.catalogue.save = function(record,date) {
  // save a record into the catalogue?
}

CLapi.internals.academic.catalogue.daily = function(date,refresh,resolve,sources) {
  var dated = function( delim, less ) {
      if ( delim === undefined ) delim = '';
      if ( less === undefined ) less = 1;
      var date = new Date();
      if ( less ) date.setDate(date.getDate() - less);
      var dd = date.getDate();
      var mm = date.getMonth()+1;
      var yyyy = date.getFullYear();
      if ( dd<10 ) dd = '0'+dd;
      if ( mm<10 ) mm = '0'+mm;
      return yyyy + delim + mm + delim + dd;
  };
  if (date === undefined) date = dated();
  if (resolve === undefined) resolve = true;
  if (sources === undefined) sources = ['crossref','europepmc'];
  var exists = false; // TODO check to see if an index has already been made for today
  if (exists && !refresh) {
    return {status: 'success', data: exists.total} // get the total in the index
  } else {    
    var records = [];
    var from, size, total, first, res, result;
    
    if ( sources.indexOf('crossref') !== -1 ) {
      from = 0;
      size = 1000;
      total = 1;
      first = true;
      while (from < total) {
        var pg = CLapi.internals.use.crossref.works.indexed(date,date,from,size,'is-update:false');
        if ( pg.status === 'success' ) {
          if (first) {
            total = pg.total;
            first = false;
          }
          for ( var r in pg.data ) {
            res = pg.data[r];
            result = {
              publisher: res.publisher,
              doi: res.DOI,
              title: res.title[0],
              author: res.author,
              journal:{
                title: res['container-title'][0],
                issn: res.ISSN,
                volume: res.volume,
                issue: res.issue            
              },
              subject:res.subject,
              source:'crossref'
            };
            if (resolve) {
              var rs = CLapi.internals.academic.resolve(result.doi);
              result.resolved = {url:rs.url,source:rs.source,cookie:rs.cookie};
            }
            records.push(result);
          }
        }
        from += size;
      }
    }
    
    if ( sources.indexOf('europepmc') !== -1 ) {
      from = 0;
      size = 1000;
      total = 1;
      first = true;
      while (from < total) {
        // if searching crossref too, don't bother looking in eupmc for articles with DOIs
        var qrystr;
        if (sources.indexOf('crossref') !== -1) qrystr = 'has_doi:n';
        var pa = CLapi.internals.use.europepmc.indexed(date,undefined,from,size,qrystr);
        if ( pa.status === 'success' ) {
          if (first) {
            total = pa.total;
            first = false;
          }
          for ( var re in pa.data ) {
            res = pa.data[re];
            result = {
              title: res.title,
              author: res.authorList.author,
              journal: {
                title: res.journalInfo.journal.title,
                volume: res.journalInfo.volume,
                issue: res.journalInfo.issue
              },
              source: 'europepmc'              
            }
            if (res.doi) result.doi = res.doi; // this won't be here as standard bc only search eupmc for non-DOI records
            if (res.pmid) result.pmid = res.pmid;
            if (res.pmcid) result.pmc = res.pmcid.toLowerCase().replace('pmc','');
            if (res.journalInfo.journal.issn) res.journal.issn = [res.journalInfo.journal.issn];
            var w;
            if (res.pmcid) {
              w = 'pmc'+res.pmcid;
            } else if (res.pmid) {
              w = 'pmid'+res.pmid;
            }
            if (w && resolve) {
              var reus = CLapi.internals.academic.resolve(w);
              result.resolved = {url:reus.url,source:reus.source,cookie:reus.cookie};
            }
            records.push(result);
          }
        }
        from += size;
      }
    }
    // TODO: add more sources to check in, and update the sources list to show where we checked    
    Claoi.internals.es.delete('/catalogue/' + date);
    CLapi.internals.es.import(records,false,'catalogue',date);
    // TODO: for every record, try to resolve it and retrieve the content for it, and save that into a store
    return {status: 'success', data: records.length}
  }
}

if ( Meteor.settings.cron.catalogue_retrieve ) {
  SyncedCron.add({
    name: 'catalogue_daily',
    schedule: function(parser) { return parser.text('at 1:00 am'); },
    job: CLapi.internals.academic.catalogue.daily
  });
}
