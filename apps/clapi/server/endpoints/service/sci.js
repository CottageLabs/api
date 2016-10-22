
// API for SCI

CLapi.addRoute('service/sci', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'The SCI API.'} };      
    }
  }
});

CLapi.addRoute('service/sci/loadcompanies', {
  get: {
    action: function() {
      var t = this.queryParams.types ? this.queryParams.types.split(',') : undefined;
      var l = this.queryParams.load && this.queryParams.load !== 'true' ? false : true;
      var u = this.queryParams.update && this.queryParams.update !== 'false' ? true : false;
      var d = this.queryParams.delay && !isNaN(parseInt(this.queryParams.delay)) && parseInt(this.queryParams.delay) > 0 ? parseInt(this.queryParams.delay) : undefined;
      return CLapi.internals.service.sci.loadcompanies(t,l,u,d);      
    }
  }
});

CLapi.addRoute('service/sci/loadcompanyurls', {
  get: {
    action: function() {
      var u = this.queryParams.update && this.queryParams.update !== 'false' ? true : false;
      CLapi.internals.service.sci.loadcompanyurls(u);
      return {status:'success'}
    }
  }
});


var Future = Npm.require('fibers/future');

CLapi.internals.service.sci = {};

CLapi.internals.service.sci.loadcompanies = function(types,load,update,delay) {
  if (types === undefined) types = ['ASX']; // ['LSE','NASDAQ','AMEX','NYSE','ASX'];
  if (load === undefined) load = false;
  if (update === undefined) update = false;
  load = true;
  update = true;
  if (delay === undefined) {
    delay = 1;
  } else {
    delay = parseInt(delay);
  }
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
      console.log('SCI load companies getting ' + purl);
      var res = CLapi.internals.convert.table2json(purl,undefined,{start:'<table class="quotes">'});
      console.log('SCI found ' + res.length + ' companies on page')
      for ( var r in res ) {
        if ( res[r].Code && res[r].Code.length > 0 && res[r].Name && res[r].Name.length > 0) {
          var exists = sci_company.findOne({code:res[r].Code});
          var company = exists ? exists : {exchange:types[t],code:res[r].Code,name:res[r].Name};
          /*try {
            var f = new Future();
            setTimeout(function() { f.return(); }, 100);
            f.wait();
            var info = CLapi.internals.use.duckduckgo.instants(res[r].Name);
            if ( info && info.Results && info.Results.length > 0 ) {
              if (info.Results[0].FirstURL) company.url = info.Results[0].FirstURL;
              if (info.Image) company.logo = info.Image;
              if (info.Abstract) company.abstract = info.Abstract;
            }
          } catch (err) {}*/
          if (exists && load && update) {
            sci_company.update(company._id,{$set:company});
          } else if (load) {
            company._id = sci_company.insert(company);
          }
          results.push(company);
        }
      }
    }  
  }
  console.log('SCI loaded ' + results.length + ' companies');
  return {status:'success',count:results.length,data:results};
}

CLapi.internals.service.sci.loadcompanyurls = function(update) {
  // on first pass found 5167 URLs from google places API for the 16712 companies that were present
  var matcher = update ? {} : {url:{$exists:false}};
  var companies = sci_company.find(matcher);
  var found = 0;
  companies.forEach(function(company) {
    var future = new Future();
    setTimeout(function() { future.return(); }, 500);
    future.wait();
    try {
      var url = CLapi.internals.use.google.places.url(company.name).data.url;
      if (url) {
        sci_company.update(company._id,{$set:{url:url}});
        found += 1;
      }
    } catch(err) {}
  });
  console.log('Found URLs for ' + found + ' companies');
  return {status:'success'}
}

CLapi.internals.service.sci.loadcompanyabstract = function(update) {
  var matcher = update ? {} : {abstract:{$exists:false}};
  var companies = sci_company.find(matcher);
  var found = 0;
  companies.forEach(function(company) {
    var future = new Future();
    setTimeout(function() { future.return(); }, 2000);
    future.wait();
    try {
      var info = CLapi.internals.use.duckduckgo.instants(company.name);
      if ( info && info.Results && info.Results.length > 0 ) {
        if (info.Results[0].FirstURL && company.url === undefined) company.url = info.Results[0].FirstURL;
        if (info.Image) company.logo = info.Image;
        if (info.Abstract) company.abstract = info.Abstract;
        found += 1;
      }
    } catch(err) {}
  });
  console.log('Found info on duckduckgo for ' + found + ' companies');
  return {status:'success'}
}





