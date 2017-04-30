
var moment = Meteor.npmRequire('moment');

precious_company = new Mongo.Collection("precious_company");
precious_company.before.insert(function (userId, doc) {
  doc.ftstr = doc.name;
  if (doc.exchange) doc.ftstr += ' (' + doc.exchange;
  if (doc.code) doc.ftstr += ' ' + doc.code;
  if (doc.exchange) doc.ftstr += ')';
  if (doc.url) doc.ftstr += ' ' + doc.url;
  doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
precious_company.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/precious/company/' + this._id, doc);
});
precious_company.before.update(function (userId, doc, fieldNames, modifier, options) {
  var ftstr = doc.name;
  if (doc.exchange) ftstr += ' (' + doc.exchange;
  if (doc.code) ftstr += ' ' + doc.code;
  if (doc.exchange) ftstr += ')';
  if (doc.url) ftstr += ' ' + doc.url;
  modifier.$set.ftstr = ftstr;
  var d = Date.now();
  modifier.$set.updatedAt = d;
  modifier.$set.updated_date = moment(d,"x").format("YYYY-MM-DD HHmm");
});
precious_company.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/precious/company/' + doc._id, doc);
});
precious_company.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/precious/company/' + doc._id);
});

precious_source = new Mongo.Collection("precious_source");
precious_source.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});



CLapi.addRoute('service/precious/sources', {
  get: {
    action: function() {
      return precious_source.find({for:'levor'}).fetch();
    }
  }
});

CLapi.addRoute('service/precious/companies', {
  get: {
    action: function() {
      var rt = '/precious/company/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/precious/company/_search',data);
    }
  }
});


// TODO is a list of all companies and their tickers necessary? Could then look for them in content
// (would this be any better than the google cloud extraction? maybe test if it pulls companies when their ticker names are present)


CLapi.internals.service.precious = {};

// track company details each day from av

// see http://www.alphavantage.co/query?apikey=XXXX&function=TIME_SERIES_INTRADAY&interval=1min&symbol=MSFT
CLapi.internals.service.precious.av = {}
// write functions for querying av API

// could also use google finance API if useful, putting info in use/google, where it should be added

CLapi.internals.service.precious.company = function(company) {
  // get details about the company
}

CLapi.internals.service.precious.scrape = function(url) {
  var s = precious_source.findOne({url:url});
  if (!s) precious_source.insert({url:url});
  // get the page, extract all the entities. look for those that are companies
  // for things that may be companies, try to look up in knowledge graph / wikidata and get ticker
  // find statements about companies and analyse their sentiment
  // get the overall sentiment of the document too
  // save info about the source page and what it was like at this time
  // save info about each company too, creating a record if not already present
  var src = Meteor.http.call('GET', url).content;
  //src = src.replace(/\n/g,'').replace(/<ul.*?<\/ul>/g,'').replace(/<a.*?<\/a>/g,''); // these can lead to slightly tidier results but lose a lot of interesting words
  src = src.replace(/<\/li>/g,'.');
  // save the content of the page as it was now to some listing of page status each time it is scraped
  var content = CLapi.internals.convert.xml2txt(undefined,src);
  var ggl = CLapi.internals.use.google.cloud.language(content,'entities');
  for ( var e in ggl.entities ) {
    var ent = ggl.entities[e];
    if (ent.type === 'ORGANIZATION') {
      // is the company already in precious_company? If not:
      // lookup the company in knowledge graph / wikidata, and get the ticker
      // want to get the sentiment and all statements about all the organisations... save them in leviathan? or elsewhere?
      // does the google analysis give enough for this? or reprocess the page again, looking for sentences including the relevant entities?
    }
  }
}

CLapi.internals.service.precious.read = function(urls) {
  if (urls === undefined) {
    urls = [];
    precious_source.find().forEach(function(src) {
      urls.push(src.url);
    });
  }
  if (typeof urls === 'string') urls = urls.split(',');
  for ( var u in urls ) {
    CLapi.internals.service.precious.scrape(urls[u]);
  }
}


if ( Meteor.settings.precious && Meteor.settings.precious.cron ) {
  if ( Meteor.settings.precious.cron.scrape ) {
    SyncedCron.add({
      name: 'precious_daily_read',
      schedule: function(parser) { return parser.recur().on('00:00:01').time() },
      job: CLapi.internals.service.precious.read
    });
  }
}


CLapi.internals.service.precious.eod = function(types,load,update,delay) {
  // this is from the old SCI demo - may or may not be useful to list companies.
  // if useful, should get more company data from knowledge graph first - but NOT currently used, just saving in case useful later
  if (types === undefined) types = ['ASX']; // ['LSE','NASDAQ','AMEX','NYSE','ASX'];
  if (load === undefined) load = false;
  if (update === undefined) update = false;
  load = true;
  update = true;
  delay = delay === undefined ? 1 : parseInt(delay);
  var results = [];
  var stocklisturl = 'http://eoddata.com/stocklist/';
  var list = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
  for ( var t in types ) {
    var url = stocklisturl + types[t] + '/';
    for ( var l in list ) {
      var future = new Future();
      setTimeout(function() { future.return(); }, delay*1000);
      future.wait();
      var purl = url + list[l] + '.htm';
      var res = CLapi.internals.convert.table2json(purl,undefined,{start:'<table class="quotes">'});
      for ( var r in res ) {
        if ( res[r].Code && res[r].Code.length > 0 && res[r].Name && res[r].Name.length > 0) {
          var exists = precious_company.findOne({code:res[r].Code});
          var company = exists ? exists : {exchange:types[t],code:res[r].Code,name:res[r].Name};
          if (exists && load && update) {
            precious_company.update(company._id,{$set:company});
          } else if (load) {
            company._id = precious_company.insert(company);
          }
          results.push(company);
        }
      }
    }
  }
  return {status:'success',count:results.length,data:results};
}
