
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
      return {status: 'success', data: CLapi.internals.academic.catalogue.extract(this.queryParams.url,undefined,this.queryParams.refresh) };
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

CLapi.internals.academic.catalogue.extract = function(url,content,refresh,doi) {
  // example URLs:
  // https://jcheminf.springeropen.com/articles/10.1186/1758-2946-3-47 (the OBSTM article, open, on jcheminf, findable by CORE and BASE)
  // http://www.sciencedirect.com/science/article/pii/S0735109712600734 (open on elsevier, not findable by CORE or BASE)
  // http://journals.plos.org/plosone/article?id=info%3Adoi%2F10.1371%2Fjournal.pone.0159909 (open, on PLOS, findable by BASE)
  // http://www.tandfonline.com/doi/abs/10.1080/09505431.2014.928678 (closed, not findable by CORE or BASE)
  var r = Catalogue.findOne({url:url}); // there is not storage yet, so never returns content yet
  if (r && !refresh) {
    return r;
  } else {
    var meta = {url:url};
		if (doi) meta.doi = doi;

    try { // get content if none was passed in, by phantom (resolving and) rendering the URL
      if (content === undefined && url !== undefined) content = CLapi.internals.phantom.get(url,undefined)
    } catch(err) {}
    //meta.content = content; // should not return this due to size...
    
		// is it worth looking for <meta name="citation_fulltext_html_url" content="" />
		// and if found what to do with it?
		
    if (url && !meta.doi) { // quick check to get a DOI if at the end of a URL, as they often are
			var mr = new RegExp(/\/(10\.[^ &#]+\/[^ &#]+)$/);
			var ud = mr.exec(decodeURIComponent(url));
      if (ud && ud.length > 1 && 9 < ud[1].length && ud[1].length < 45) meta.doi = ud[1];
    }
		if (!meta.doi && content) {
			try {
				//<meta name="DC.Identifier" content="10.1126/science.aam5488" /
				var cl = content.toLowerCase();
				if (cl.indexOf('dc.identifier') !== -1) {
					cl = cl.split('dc.identifier')[1].split('content')[1];
					if (cl.indexOf('"') !== -1) cl = cl.split('"')[1];
					if (cl.indexOf("'") !== -1) cl = cl.split("'")[1];
					if (cl.indexOf('10.') === 0 && cl.indexOf('/') !== -1) meta.doi = cl;
				}
			} catch(err) {}
		}
    if (!meta.doi && content) { // look for DOI in content
			// TODO add a check for <meta name="citation_doi" content="DOI" />
      try {
        var d = CLapi.internals.tdm.extract({
          content:content,
          matchers:[
            '/doi[^>;]*?(?:=|:)[^>;]*?(10[.].*?\/.*?)("|\')/gi',
            '/dx[.]doi[.]org/(10[.].*?/.*?)("| \')/gi'
          ]
        });
        for ( var n in d.matches) {
          if (!meta.doi && 9 < d.matches[n].result[1].length && d.matches[n].result[1].length < 45) {
            meta.doi = d.matches[n].result[1];
            if (meta.doi.endsWith('.')) meta.doi = meta.doi.substring(0,meta.doi.length-1);
          }
        }
      } catch(err) {}
    }

    // try matching pmid OR pubmed id OR pmc plus number regex anywhere in page
    // this may not be reliable, too high a chance of it being a referenced doc
    // and so far the matches don't work anyway
    /*if (content) {
      try {
        var p = CLapi.internals.tdm.extract({
          content:content,
          //matchers:['/(pmc| pmcid|pmc id|pmid|pubmed|pubmedid|pubmed id)[ :-]*?([0-9]{1,10})/gi'],
          matchers:['/pmc([0-9]{1,10})/gi'],
          start:'<head',
          end:'</head'
        });
        meta.p = p;
        // set pmid or pmc in meta if found - check if 2nd match starts with pmc and if so grab the 3rd
      } catch(err) {}
    }*/

    // get a title from the page if not present yet
    if (!meta.title && content && content.indexOf('og:title') !== -1) {
      meta.title = content.split('og:title')[1].split('content')[1].split('=')[1].replace('/>','>').split('>')[0].trim().replace(/"/g,'');
      if (meta.title.startsWith("'")) meta.title = meta.title.substring(1,meta.title.length-1);
		} else if (!meta.title && content && content.indexOf('"citation_title" ') !== -1 ) {
			meta.title = content.split('"citation_title" ')[1].replace(/ = /,'=').split('content="')[1].split('"')[0];
    } else if (!meta.title && content && content.indexOf('<title') !== -1) {
      meta.title = content.split('<title')[1].split('>')[1].split('</title')[0].trim();
    }
    // if title found but still no DOI could possibly do a crossref title search to get a doi...

    // if a doi is present then look it up in crossref for much more metadata
    if (meta.doi) {
      try {
        var cr = CLapi.internals.use.crossref.works.doi(meta.doi).data;
        meta.title = cr.title[0]; // because of science diret elsevier article locator, crossref is more reliable
        if (!meta.author && cr.author) meta.author = cr.author;
        if (!meta.journal && cr['container-title']) meta.journal = cr['container-title'][0];
        if (!meta.issn && cr.ISSN) meta.issn = cr.ISSN[0];
        if (!meta.subject && cr.subject) meta.subject = cr.subject;
        if (!meta.publisher && cr.publisher) meta.publisher = cr.publisher;
      } catch(err) {}
    }

    // pull keywords or extract them if not present
    if (!meta.keywords) {
			// TODO add a check for <meta name="citation_keywords" content="KEYWORD" />
			// in which case the tag can appear multiple times, the keywords are not all in one tag
      try {
        var k = CLapi.internals.tdm.extract({
          content:content,
          matchers:[
            '/meta[^>;"\']*?name[^>;"\']*?= *?(?:"|\')keywords(?:"|\')[^>;"\']*?content[^>;"\']*?= *?(?:"|\')(.*?)(?:"|\')/gi'
          ],
          start:'<head',
          end:'</head'
        });
        var kk = k.matches[0].result[1];
        if (kk.indexOf(';') !== -1) {
          kk = kk.replace(/; /g,';').replace(/ ;/g,';');
          meta.keywords = kk.split(';');
        } else {
          kk = kk.replace(/, /g,',').replace(/ ,/g,',');
          meta.keywords = kk.split(',');
        }
      } catch(err) {}
      // if still no keywords try just generating some from the page content
      /*if (content && (!meta.keywords || meta.keywords.length === 0) ) {
        var tc = '<body'+content.toLowerCase().split('<body')[1].split('</body')[0]+'</body>';
        if (tc.indexOf('abstract</h') !== -1) {
          tc = tc.split('abstract</h')[1].split(/>(.+)/)[1].split('<h')[0];
        }
        tc = tc.replace(/<a .*?>/gi,'').replace('</a>','');
        tc = tc.replace(/<img .*?>/gi,'').replace('</img>','');
        var c = CLapi.internals.convert.html2txt(undefined,tc);
        //meta.c = c;
        meta.keywords = CLapi.internals.tdm.keywords(c,{max:10});
      }*/
    }
    
    // try to get emails out of the page content
    if (!meta.email) {
			var mls = [];
      try {
        var m = CLapi.internals.tdm.extract({
          content:content,
          matchers:[
            '/mailto:([^ \'">{}/]*?@[^ \'"{}<>]*?[.][a-z.]{2,}?)/gi',
            '/(?: |>|"|\')([^ \'">{}/]*?@[^ \'"{}<>]*?[.][a-z.]{2,}?)(?: |<|"|\')/gi'
          ]
          //start:'<body', // splitting on body cannot be relied on - the PLOS option has 4 bodies, for example
          //end:'</body'
        });
        for ( var i in m.matches) {
          var mm = m.matches[i].result[1].replace('mailto:','');
          if (mm.endsWith('.')) mm = mm.substring(0,mm.length-1);
          if (mls.indexOf(mm) === -1) mls.push(mm);
        }
      } catch(err) {}
			mls.sort(function(a, b) { return b.length - a.length; });
			var mstr = '';
      meta.email = [];
			for ( var me in mls) {
				if (mstr.indexOf(mls[me]) === -1) meta.email.push(mls[me]);
				mstr += mls[me];
			}
    }
    
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
