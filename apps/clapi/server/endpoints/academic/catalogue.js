
// academic catalogue

Catalogue = new Mongo.Collection("catalogue");
Catalogue.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
Catalogue.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/catalogue/article/' + this._id, doc);
});
Catalogue.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
Catalogue.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/catalogue/article/' + doc._id, doc);
});
Catalogue.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/catalogue/article/' + doc._id);
});

CLapi.addRoute('academic/catalogue', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'query an academic catalogue'} };
    }
  }
});

CLapi.addRoute('academic/catalogue/extract', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.academic.catalogue.extract(this.queryParams.url,this.queryParams.refresh) };
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

CLapi.internals.academic.catalogue.extract = function(url,refresh) {
  // example URLs:
  // http://www.sciencedirect.com/science/article/pii/S0735109712600734
  // http://journals.plos.org/plosone/article?id=info%3Adoi%2F10.1371%2Fjournal.pone.0159909
  var r = Catalogue.findOne({url:url});
  if (r && !refresh) {
    return r.metadata;
  } else {
    var meta = {url:url};
    // get the URL content then extract metadata from it
    if (url.indexOf('?') === -1) url += '?';
    url += '&np=y'; //this forces sciencedirect to load full page - may need to collect a bunch of these sorts of things for different sites. cookies and resolving made no difference
    //url = CLapi.internals.academic.redirect_chain_resolve(url);
    //meta.resolved = url;
    //var res = Meteor.http.call('GET',url);
    //var cookie = res.headers['set-cookie'] ? res.headers['set-cookie'].join( "; " ) : '';
    var get = Meteor.http.call('GET',url,{npmRequestHeaders:{
      //'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
      //'Set-Cookie': cookie,
      //'Content-Type': 'text/plain'
    }});
    // DC terms in general
    // og: opengraph terms
    // http://schema.org/ terms
    // DOI, PMCID, PMID
    // ORCIDs if any (probably not)
    // look for title, authors, journal info etc
    // should use features similar to academic/licence, which should perhaps be abstracted out. Or perhaps features in service/contentmine are already enough, or the tdm.js tool
    // what is crucially needed for now, is for oabutton, which is page title and any contact email address for an author on the page
    //meta.get = get;
    if (get.content && get.content.indexOf('<title>') !== -1) meta.title = get.content.split('<title>')[1].split('</title>')[0];
    meta.email = [];
    //meta._id = Catalogue.insert(meta);
    return meta;
  }
}

CLapi.internals.academic.catalogue.save = function(record,date) {
  // save a record into the catalogue?
}

CLapi.internals.academic.catalogue.daily = function(date,refresh,resolve,sources,retrieve) {
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
  if (retrieve === undefined) retrieve = true;
  var exists = false; // TODO check to see if an index has already been made for today
  if (exists && !refresh) {
    return {status: 'success', data: exists.total} // get the total in the index
  } else {    
    var uuid = Meteor.npmRequire('node-uuid');
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
            result._id = uuid.v4();
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
            result._id = uuid.v4();
            records.push(result);
          }
        }
        from += size;
      }
    }
    // TODO: add more sources to check in, and update the sources list to show where we checked    
    if (retrieve) {
      var fs = Meteor.npmRequire('fs');
      // TODO create a folder in the store named by todays date
      for ( var rr in records ) {
        var rc = records[rr];
        if (rc.resolved && rc.resolved.url ) {
          var cookie = '';
          if (rc.resolved.cookie) {
            var resp = Meteor.http.call('GET',rc.resolved.cookie);
            if (resp.headers['set-cookie']) cookie = resp.headers['set-cookie'].join( "; " );
          }
          var fl = Meteor.http.call('GET',rc.resolved.url,{npmRequestHeaders:{'Set-Cookie':cookie}}); // TODO check is this how to pass in the cookie
          // fs.mkDirSync(); // TODO create a folder in todays date with the uuid of this record
          // fs.writeFileSync() // TODO write the file using sanitised URL and then put the fl content into the file
          try {
            // TODO file2txt needs to accept content instead of url
            // OR just upload the file itself as an attachment and let es deal with it directly?
            // if so how will this work with a bulk upload? need to send separately after record creation?
            // records[rr].content = CLapi.internals.convert.file2txt(fl);
          } catch(err) {}
        }
      }
    }
    Claoi.internals.es.delete('/catalogue/' + date);
    CLapi.internals.es.import(records,false,'catalogue',date);
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
