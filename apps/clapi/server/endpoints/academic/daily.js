
// create a list of everything published on a given day - TODO consider using the indexed / created dates rather than published dates
// use the "use" services to connect to places to get the list
// probably best option is crossref
// use academic/resolve to resolve them to URLs that can be followed with cookies if necessary
// get metadata for all items, or just the URLs?

// process them all with lantern, etc? Could have an automatic store of everything as it is published, for future retrieval
// put everything into catalogue?
// should insert save all records into ES academic catalogue too, if not already in there? - 
// No, catalogue should probably run itself daily over all other resources, get the list from here, run through lantern, etc

academic_daily = new Mongo.Collection("academic_daily");
CLapi.addCollection(academic_daily);

CLapi.addRoute('academic/daily', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a list of every academic article indexed on a given date, when date is appended to this URL in the form 2016-03-01. Sources are crossref and europepmc so far'} };
    }
  }
});

CLapi.addRoute('academic/daily/:date', {
  get: {
    action: function() {
      var sources;
      if (this.queryParams.sources) sources = this.queryParams.sources.split(',');
      return CLapi.internals.academic.daily(this.urlParams.date,this.queryParams.refresh,this.queryParams.resolve,sources);
    }
  }
});

CLapi.internals.academic.daily = function(date,refresh,resolve,sources) {
  // TODO if resolve, do what? the academic/resolve function actually uses europepmc and crossref, which are already getting called
  // so what data do we have to do the resolving with already? or should the calls just be repeated?
  var dated = function( delim, less ) {
      if ( delim === undefined ) delim = '-';
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
  if (sources === undefined) sources = ['crossref','europepmc'];
  var exists = academic_daily.findOne(date);
  if (exists && !refresh) {
    return {status: 'success', data: exists.records, total:exists.total}
  } else {
    var results = [];
    
    if ( sources.indexOf('crossref') !== -1 ) {
      var from = 0;
      var size = 1000;
      var total = 1;
      var first = true;
      while (from < total) {
        var pg = CLapi.internals.use.crossref.works.indexed(date,date,from,size,'is-update:false');
        from += size;
        if ( pg.status === 'success' ) {
          if (first) total = pg.total;
          for ( var r in pg.data ) {
            var res = pg.data[r];
            var result = {
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
            //var rs = CLapi.internals.academic.resolve(result.doi);
            //result.resolved = {url:rs.url,source:rs.source,cookie:rs.cookie};
            results.push(result);
          }
        }
        if (first) first = false;
      }
    }
    
    if ( sources.indexOf('europepmc') !== -1 ) {
      var from = 0;
      var size = 1000;
      var total = 1;
      var first = true;
      while (from < total) {
        // if searching crossref too, don't bother looking in eupmc for articles with DOIs
        var qrystr;
        if (sources.indexOf('crossref') !== -1) qrystr = 'has_doi:n';
        var pa = CLapi.internals.use.europepmc.indexed(date,undefined,from,size,qrystr);
        from += size;
        if ( pa.status === 'success' ) {
          if (first) total = pa.total;
          for ( var re in pa.data ) {
            var res = pa.data[re];
            var result = {
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
            /*var w;
            if (res.pmcid) {
              w = 'pmc'+res.pmcid;
            } else if (res.pmid) {
              w = 'pmid'+res.pmid;
            }
            if (w) {
              var reus = CLapi.internals.academic.resolve(w);
              result.resolved = {url:reus.url,source:reus.source,cookie:reus.cookie};
            }*/
            results.push(result);
          }
        }
        if (first) first = false;
      }
    }

    // TODO: add more sources to check in, and update the sources list to show where we checked
    
    if (results.length > 0) {
      if (refresh && exists) {
        academic_daily.update(exists._id, {$set:{records:results,total:results.length,sources:sources}});
      } else {
        academic_daily.insert({_id:date,records:results,total:results.length,sources:sources});
      }
    }
    return {status: 'success', data: results, total:results.length}
  }
}

if ( Meteor.settings.cron.academicdaily ) {
  SyncedCron.add({
    name: 'academicdaily',
    schedule: function(parser) { return parser.text('at 1:00 am'); },
    job: CLapi.internals.academic.daily
  });
}

