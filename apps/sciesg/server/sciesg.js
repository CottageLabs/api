
var getexamplesecurity = function() {
  var security = {};
  security.ID01 = "";
  security.ID02 = "";
  security.ID03 = "";
  security.ID04 = "";
  security.ID05 = "";
  security.ID06 = "";
  security.ID07 = "";
  security.ID08 = "";
  security.ID09 = "";
  security.ID10 = "";
  security.ID11 = "";
  security.ID12 = "";
  security.ID13 = "";
  security.ID14 = "";
  security.ID15 = "";
  security.ID16 = "";
  security.ID17 = "";
  security.ID18 = "";
  security.ID19 = "";
  security.ID20 = "";
  security.ID21 = "";
  security.ID22 = "";
  security.ID23 = "";
  security.ECQNT01 = "";
  security.ECQNT02 = "";
  security.ECQNT03 = "";
  security.ECQNT04 = "";
  security.ECQNT05 = "";
  security.ECQNT06 = "";
  security.ECQNT07 = "";
  security.ECQNT08 = "";
  security.ECQNT09 = "";
  security.ECQNT10 = "";
  security.ECQNT11 = "";
  security.ECQNT12 = "";
  security.ECQNT13 = "";
  security.ECQNT14 = "";
  security.ECQNT15 = "";
  security.ECQNT16 = "";
  security.ENQAL01 = "";
  security.ENQAL02 = "";
  security.ENQAL03 = "";
  security.ENQAL04 = "";
  security.ENQAL05 = "";
  security.ENQAL06 = "";
  security.ENQAL07 = "";
  security.ENQAL08 = "";
  security.ENQNT01 = "";
  security.ENQNT02 = "";
  security.ENQNT03 = "";
  security.ENQNT04 = "";
  security.ENQNT05 = "";
  security.ENQNT06 = "";
  security.ENQNT07 = "";
  security.ENQNT08 = "";
  security.ENQNT09 = "";
  security.ENQNT11 = "";
  security.ENQNT10 = "";
  security.GOQAL01 = "";
  security.GOQAL02 = "";
  security.GOQAL03 = "";
  security.GOQAL05 = "";
  security.GOQAL04 = "";
  security.GOQAL06 = "";
  security.GOQAL07 = "";
  security.GOQAL08 = "";
  security.GOQAL09 = "";
  security.GOQNT01 = "";
  security.GOQNT02 = "";
  security.GOQNT03 = "";
  security.GOQNT04 = "";
  security.GOQNT05 = "";
  security.GOQNT06 = "";
  security.GOQNT07 = "";
  security.GOQNT08 = "";
  security.GOQNT09 = "";
  security.GOQNT10 = "";
  security.GOQNT11 = "";
  security.GOQNT12 = "";
  security.GOQNT13 = "";
  security.KE01 = "";
  security.KE02 = "";
  security.KE03 = "";
  security.KE04 = "";
  security.KE05 = "";
  security.KE06 = "";
  security.KE07 = "";
  security.KE08 = "";
  security.KE09 = "";
  security.KE10 = "";
  security.KE11 = "";
  security.KE12 = "";
  security.KE13 = "";
  security.KE14 = "";
  security.KE15 = "";
  security.KE16 = "";
  security.KE17 = "";
  security.KE18 = "";
  security.KE19 = "";
  security.KE20 = "";
  security.SOQAL01 = "";
  security.SOQAL02 = "";
  security.SOQAL03 = "";
  security.SOQAL04 = "";
  security.SOQAL05 = "";
  security.SOQAL06 = "";
  security.SOQAL07 = "";
  security.SOQAL08 = "";
  security.SOQAL09 = "";
  security.SOQAL10 = "";
  security.SOQNT01 = "";
  security.SOQNT02 = "";
  security.SOQNT03 = "";
  security.SOQNT04 = "";
  security.SOQNT05 = "";
  security.SOQNT06 = "";
  security.SOQNT07 = "";
  security.SOQNT08 = "";
  security.SOQNT09 = "";
  return security;
}

var newest = function(dir,suffix) {
  var best = false;
  var ntime = 0;
  var fs = Meteor.npmRequire('fs');
  var files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    if (suffix === undefined || files[i].indexOf('.' + suffix.replace('.','')) !== -1) {
      var nt = fs.statSync(dir+files[i]).mtime.getTime();
      if (nt > ntime) {
        ntime = nt;
        best = files[i];
      }
    }
  }  
  return best;
}

var getmatchers = function() {
  // this should look up matchers from storage
  return [
    {kpi:'KE01', regex:'/.*,{0,1}? CEO,{0,1}?.*/g', security:[], files:[]}, // CEO NAME
    //{kpi:'KE05', regex:'//gi', security:[], files:[]}, // CEO BIOGRAPHY
    {kpi:'ENQNT04', regex:'/total (?:air|ghg) emission.*([0-9.,]+)/gi', security:[], files:[]}, // TOTAL GHG EMISSIONS
    {kpi:'ENQNT01', regex:'/total salar.*([0-9.,]+)/gi', security:[], files:[]}, // Total Salaries
    //{kpi:'GOQNT07', regex:'//gi', security:[], files:[]}, // LOBBYING (US VALUE)
    //{kpi:'SOQAL01', regex:'//gi', security:[], files:[]} // SOCIAL POLICY
    {kpi:'ECQNT05', regex:'/(?:total|gross) revenue.*?([0-9.,]+)/gi', security:[], files:[]},
    //{kpi:'ECQNT06', regex:'/Gross Profit.*?([0-9.,]+)/gi', security:[], files:[]}
  ]
}


Meteor.publish("companies", function () {
  return sci_company.find();
});
Meteor.publish("securities", function (sid) {
  if (sid) {
    return sci_security.find(sid);
  } else {
    return sci_security.find();  
  }
});



Meteor.methods({
  addmatcher: function(matcher) {
    // new matcher, should have keys regex, kpi, and optionally sid, and possibly filename too
    matcher._id = sci_matcher.insert(matcher);
    return matcher;
  },
  
  addcompany: function(dets) {
    // create a new company record manually
    // usually these should be created from csv and API uploads
    dets._id = sci_company.insert(dets);
    return dets;
  },
  updatecompany: function(cid,fields) {
    sci_company.update(cid,{$set:fields});
    // should maybe add a check for any securities about this company, and if present update them all too
    /*var secs = sci_security.find({cid:cid});
    secs.forEach(function(sec) {
      sci_security.update(sec._id,{$set:fields});
    });*/
  },
  
  addsecurity: function(cid,fields) {
    // a new security created from a company listed on the system
    // creating a new security does NOT make it available to users, but it can be made available once ready
    // a security should have all the kpi values as fields, with as many of them populated as possible
    // start with the company record
    var security = getexamplesecurity();
    var company = sci_company.findOne(cid);
    for ( var c in company ) {
      if ( c === '_id' ) {
        security.cid = company._id
      } else if ( ['createdAt','updatedAt'].indexOf(c) === -1 ) {
        security[c] = company[c];
      }
    }
    security.available = false;
    for ( var f in fields ) security[f] = fields[f];
    security._id = sci_security.insert(security);
    return security;
  },
  updatesecurity: function(sid,fields) {
    sci_security.update(sid,{$set:fields});
    if (false) {
      // if any of the updated fields are keys that also belong to the company info, update the company record too?
      var cfields = {};
      var security = sci_security.findOne(sid);
      sci_company.update(security.cid,{$set:cfields});
    }
    /*var company = sci_company.findOne();
    secs.forEach(function(sec) {
      sci_security.update(sec._id,{$set:fields});
    });*/
  },
  crawlsecurity: function(sid) {
    var security = sci_security.findOne(sid);
    var dir = Meteor.settings.uploadServer.uploadDir + '/sciesg/' + sid + '/';
    // wget -r -R js,txt,png,bmp,jpg,jpeg,mov,avi,asf,qt,gif,avchd,flv,swf,mpg,mpeg,mp4,wmv,divx,ogg,ogv,webm --ignore-tags=link,img,script --ignore-case  http://www.shell.com
    // do this async
    // also intermittently run a cleanup script that removes anything that is not a pdf, whilst the wget is going on
    var wget = 'wget -P ' + dir + ' -r -R js,txt,png,bmp,jpg,jpeg,mov,avi,asf,qt,gif,avchd,flv,swf,mpg,mpeg,mp4,wmv,divx,ogg,ogv,webm --ignore-tags=link,img,script --ignore-case ' + security.url;
    var child = exec(wget, function(err, stdout, stderr) {
      if (err) throw err;
      else console.log(security.url + ' downloaded to ' + dir);
      // once finished, email someone
    });
    /* if the above does not work, do something like...
    although this import statement may have to be like the old require statement instead
    import exec from 'child_process';
    var exec = Npm.require('child_process').exec;
    var eexec = function(cmd, callback) {
      console.log('async exec ' + cmd);
      var child = exec(cmd, function(err, out, code) { 
        console.log(err);
        console.log(out);
        console.log(code);
        callback(null, out); 
      });
    };
    var aexec = Async.wrap(eexec);
    aexec(wget);*/
    console.log('Execed the security crawl for ' + security._id + ' at ' + security.url + ' it will run for a while...');
    return;
    // automatically run the extract on completion?
  },
  extractsecurity: function(sid) {
    var dir = Meteor.settings.uploadServer.uploadDir + 'sciesg/' + sid + '/';
    var fs = Meteor.npmRequire('fs');
    var files = fs.readdirSync(dir);
    var results = [];
    var matchers = [];
    var matchobjs = getmatchers();
    for ( var m in matchobjs ) matchers.push(matchobjs[m].regex);
    for (var i = 0; i < files.length; i++) {
      var fl = dir + files[i];
      console.log('starting extract on ' + fl);
      var content = fs.readFileSync(fl);
      var text = CLapi.internals.convert.file2txt(undefined, content, {preserveLineBreaks:true});
      //var keywords = CLapi.internals.tdm.keywords(text.toLowerCase(),{ngrams:1,min:3,score:true,limit:20,stem:true,len:5});
      var extracts = CLapi.internals.tdm.extract({content:text,matchers:matchers});
      // track which year these results are for
      results.push({text:text,extracts:extracts,file:fl,sid:sid});
      // save to an index or to the security record itself?
      // save the text somewhere too
    }
    // keep all the raw files or chuck them? keep for now, can start chucking if storage gets out of hand
    return results;
  },
  
  // save extracted results over what was initially saved - this allows a loop for user interaction to tidy them up or edit them later
  // save them wherever they are getting saved - on the security record, or in their own collection
  savekpi: function(kpi) {
    
  },
  savekpis: function(list) {
    
  },
  
  newest: function() {
    var fn = newest(Meteor.settings.uploadServer.uploadDir + '/sciesg/','pdf');
    return fn;
  },
  extract: function(fn) {
    var dir = Meteor.settings.uploadServer.uploadDir + '/sciesg/';
    if (fn === undefined) fn = newest(dir,'pdf');
    console.log('starting extract on ' + fn);
    if (fn) {
      var fl = dir + fn;
      var fs = Meteor.npmRequire('fs');
      var content = fs.readFileSync(fl);
      var text = CLapi.internals.convert.file2txt(undefined, content, {preserveLineBreaks:true});
      fs.writeFileSync(dir + fn.split('.')[0] + '.txt', text);
      var keywords = CLapi.internals.tdm.keywords(text.toLowerCase(),{ngrams:1,min:3,score:true,limit:20,stem:true,len:5});
      var matchers = [
        '/Sales volumes.*?([0-9.,]+)/gi',
        '/Total revenue.*?([0-9.,]+)/gi',
        '/Gross Profit.*?([0-9.,]+)/gi',
        '/Capital expenditure.*?([0-9.,]+)/gi',
        '/Net Debt.*?([0-9.,]+)/gi',
        '/Headroom.*?([0-9.,]+)/gi',
        '/Committed Bank Facilities.*?([0-9.,]+)/gi',
        '/Corporate Bonds.*?([0-9.,]+)/gi',
        '/Total air emissions.*([0-9.,]+)/gi'
      ]
      var extracts = CLapi.internals.tdm.extract({content:text,matchers:matchers});
      var res = {text:text,keywords:keywords,extracts:extracts,title:fn.split('.')[0]};
      fs.writeFileSync(dir + fn.split('.')[0] + '.json', JSON.stringify(res,"","  "));
      return res;
    } else {
      return false;
    }
  }
});


/*

Main KPI (see full csv list in SCI repo):

ID01 - Security 
Name of company, bond or option; a financial instrument that represents ownership position in public company (stock), 
creditor to government of corporation (bond) or rights to ownership (option).

ID02 - SEDOL
Acronym for Stock Exchange Daily Official List. An identifier assigned to securities by the London Stock Exchange.

ID03 - Ticker
Identifier assigned to securities listed on stock exchanges.

ID04 - URL
Acronym for Uniform Resource Locator; reference to a resource/location on the web

ID05 - Twitter
Corporate twitter feed

ID06 - LinkedIn
Company LinkedIn page

ID07 - News
News articles referencing Security

ID08 - Media
Video and audio featuring or referencing the research target

ID09 - Reporting year
Reporting period spanning time covered by a set of reports and/or financial statements

ID10 - Country
International location of registered office

ID11 - Sector
Category defining sector of classification

ID12 - Industry
Category defining industry of classification

ID13 - Sub-industry
Category defining sub-industry of classification

KE01 - CEO Name
Name of Chief Executive Officer

KE05 - CEO Biography
CEO Biography

ENQNT04 - TOTAL GHG EMISSIONS
Total amount of Scope 1 and Scope 2 greenhouse gas emissions recorded during the reporting year

GOQNT07 - LOBBYING (US VALUE)
Total amount spent on lobbying within the reporting period

SOQAL01 - SOCIAL POLICY
Organization-wide policy (or policies) and/or public domain statement that defines overall commitment 
related to social disclosure(s) and sustainability    



*/




