
// sprint 2
// https://github.com/CottageLabs/oacwellcome/issues/91
// add these dates from EPMC - they are in the xml, are they in the API?:
// <dateofPublication>
// <electronicPublicationDate>
// AND https://github.com/CottageLabs/oacwellcome/issues/94
// Add Funder/grant number from EPMC data


// The Lantern API
lantern_jobs = new Mongo.Collection("lantern_jobs"); // batches of submitted jobs from users
lantern_processes = new Mongo.Collection("lantern_processes"); // individual processes of ident object sets {doi:"blah",pmid:"same"}
lantern_results = new Mongo.Collection("lantern_results"); // results for particular identifiers

CLapi.addCollection(lantern_jobs);
CLapi.addCollection(lantern_processes);
CLapi.addCollection(lantern_results);

lantern_jobs.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
lantern_processes.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
lantern_results.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});

// curl -X POST -F "userid=1" -F "filecomment=This is a CSV file" -F "upload=@/Users/mm/Desktop/lanterntest.csv" http://dev.api.cottagelabs.com/service/lantern
  
lantern_processes.findByIdentifier = function(idents) {
  var m = {
    pmcid: idents.pmcid,
    pmid: idents.pmid,
    doi: idents.doi,
    title: idents.title
  }
  return lantern_processes.findOne({$or: [m]});
}
lantern_results.findByIdentifier = function(idents) {
  var m = {
    pmcid: idents.pmcid,
    pmid: idents.pmid,
    doi: idents.doi,
    title: idents.title
  }
  return lantern_results.findOne({$or: [m]});
}

CLapi.addRoute('service/lantern', {
  get: {
    action: function() {
      // could trigger a simple GET with query param to submit one URL
      if ( this.queryParams.doi ) {
        // make a new job
        return {status: 'todo'}
      } else {
        return {status: 'success', data: 'The lantern API'}
      }
    }
  },
  post: function() {
    // cannot receive files to meteor restivus! Another ridiculous thing!!!
    var j = CLapi.internals.service.lantern.job(this.request.body,this.userId);
    //console.log(this.request.body);
    return {status: 'success', data: {job:j}};
  }
});

CLapi.addRoute('service/lantern/:job', {
  get: {
    action: function() {
      // return the info of the job - the job metadata and the progress so far
      var job = lantern_jobs.findOne(this.urlParams.job);
      if (job) {
        job.progress = CLapi.internals.service.lantern.progress(this.urlParams.job);
        return {status: 'success', data: job}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('service/lantern/:job/progress', {
  get: {
    action: function() {
      // return the info of the job - the job metadata and the progress so far
      var job = lantern_jobs.findOne(this.urlParams.job);
      if (job) {
        var progress = CLapi.internals.service.lantern.progress(this.urlParams.job);
        return {status: 'success', data: progress}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('service/lantern/:job/todo', {
  get: {
    action: function() {
      // return the parts of the job still to do, does not check for results found since last progress check
      var job = lantern_jobs.findOne(this.urlParams.job);
      if (job) {
        var todo = CLapi.internals.service.lantern.todo(this.urlParams.job);
        return {status: 'success', data: todo}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('service/lantern/:job/results', {
  // can anyone retrieve results of a job or just the submitter or some other set?
  get: {
    action: function() {
      // return the results for this job as JSON
      var res = CLapi.internals.service.lantern.results(this.urlParams.job,this.userId);
      if ( this.queryParams.format && this.queryParams.format === 'csv' ) {
        var grantcount = 0;
        for ( var k in res ) {
          var rk = res[k];
          var igc = 0;
          for ( var key in rk ) {
            if (key.indexOf('Grant ') === 0) igc += 1;
          }
          if (igc > grantcount) grantcount = igc;
        }
        var fields = [
          'PMCID','PMID','DOI','Publisher','Journal title','ISSN','Article title','Author(s)','Publication Date','Electronic Publication Date',
          'Fulltext in EPMC?','XML Fulltext?','AAM?','Open Access?','Licence','Licence source','Journal Type','Correct Article Confidence',
          'Standard Compliance?','Deluxe Compliance?'
        ];
        for ( var gi=0; gi < grantcount; gi++) {
          fields.push('Grant ' + (parseInt(gi)+1));
          fields.push('Agency ' + (parseInt(gi)+1));
        }
        fields.push('Compliance Processing Output');
        var ret = CLapi.internals.convert.json2csv(undefined,res,{fields:fields}).replace(/\\r\\n/g,'\r\n'); // handles an oddity where internally to json2csv these just become text, somehow
        var job = lantern_jobs.findOne(this.urlParams.job);
        var name = 'results';
        if (job.name) name = job.name.split('.')[0] + '_results';
        this.response.writeHead(200, {
          'Content-disposition': "attachment; filename="+name+".csv",
          'Content-type': 'text/csv',
          'Content-length': ret.length
        });
        this.response.write(ret);
        this.done();
        return {}  
      } else {
        return {status: 'success', data: res}
      }
    }
  }
});

CLapi.addRoute('service/lantern/result/:res', {
  get: {
    action: function() {
      // find and return the result - could just expose the collection?
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      // which group allows deletion of a particular result?
      // remove a result for the provided ident paramg
      // ident could be one of the allowed types doi,pmid,pmcid,title
      // deletion is useful in case a result is stale. Should there be a stale checker?
    }
  }
});

// routes to get a count of processes, running processes, reset all processing processes to not processing
// should probably have admin auth or be removed
CLapi.addRoute('service/lantern/processes', {
  get: {
    action: function() {
      return {status: 'success', data: lantern_processes.find({}).count() }
    }
  }
});
CLapi.addRoute('service/lantern/processes/running', {
  get: {
    action: function() {
      return {status: 'success', data: lantern_processes.find({processing:{$exists:true}}).count() }
    }
  }
});
CLapi.addRoute('service/lantern/processes/reset', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.reset() }
    }
  }
});

// a route to trigger a specific process - should probably have admin auth or be removed
CLapi.addRoute('service/lantern/process/:proc', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.process(this.urlParams.proc) }
    }
  }
});

// convenience to remove jobs, processes, results. should have admin auth or be removed
CLapi.addRoute('service/lantern/remove/:which', {
  delete: {
    action: function() {
      console.log(this.urlParams.which);
      if ( this.urlParams.which === 'jobs') {
        lantern_jobs.remove({});
      } else if ( this.urlParams.which === 'processes') {
        lantern_processes.remove({});
      } else if ( this.urlParams.which === 'results') {
        lantern_results.remove({});
      }
      return {status: 'success' }
    }
  }
});


CLapi.internals.service.lantern = {};

CLapi.internals.service.lantern.reset = function() {
  // reset all processing processes
  var procs = lantern_processes.find({processing:{$exists:true}});
  var count = 0;
  procs.forEach(function(row) {
    lantern_processes.update(row._id,{$set:{processing:undefined}});
    count += 1;
  });
  return count;
}

// Lantern submissions create a trackable job
// accepts list of articles with one or some of doi,pmid,pmcid,title
CLapi.internals.service.lantern.job = function(input,user) {
  // is there a limit on how long the job list can be? And is that limit controlled by user permissions?
  // create a job that knows all the IDs to be looked for in the job
  // put all the jobs on the queue to process each of them
  // can user be anonymous?
  var job = {user:user};
  var list;
  if (input.list) { // list could be obj with metadata and list, or could just be list
    list = input.list;
    if (input.name) job.name = input.name;
  } else {
    list = input;
  }
  job.list = list;
  for ( var i in list ) {
    var j = list[i];
    if ( j.DOI ) {
      list[i].doi = j.DOI;
      delete list[i].DOI;
    }
    if ( j.PMID ) {
      list[i].pmid = j.PMID;
      delete list[i].PMID;
    }
    if ( j.PMCID ) {
      list[i].pmcid = j.PMCID;
      delete list[i].PMDIC;
    }
    if ( j.TITLE ) {
      list[i].title = j.TITLE;
      delete list[i].TITLE;
    }
    if (j.pmcid) j.pmcid = j.pmcid.toLowerCase().replace('pmc','');
    var proc = {
      pmcid: j.pmcid,
      pmid: j.pmid,
      doi: j.doi,
      title: j.title
    };
    var result = lantern_results.findByIdentifier(proc);
    if (result) {
      job.list[i].result = result._id;
    } else {
      var process = lantern_processes.findByIdentifier(proc);
      process ? job.list[i].process = process._id : job.list[i].process = lantern_processes.insert(proc);
    }
  }
  return lantern_jobs.insert(job); // this returns the ID of the new job - should it return the whole job?
}

CLapi.internals.service.lantern.process = function(processid,identifier,type) {
  // process a job from the lantern_processes job list, or do a job directly if given an identifier?
  var proc;
  if ( processid !== undefined ) {
    proc = lantern_processes.findOne(processid);
  } else if (identifier) {
    var m = {};
    m[type] = identifier;
    proc = lantern_processes.findOne(m);
    if (!proc) proc = lantern_processes.insert(m) // how to get identifier type? and does this return proc id or proc?
  }
  if (!proc) return false;
    
  var result = lantern_results.findByIdentifier(proc);
  if (result) {
    // this short circuits the process by using already-found results. Should perhaps have staleness / refreshness features
    lantern_processes.remove(proc._id);
    return result;
  } else {
    proc.processing = true;
    lantern_processes.update(proc._id, {$set:{processing:true}});
  }

  // the result object to build, all the things we want to know
  result = {
    '_id': proc._id,
    pmcid: proc.pmcid, // identifiers
    pmid: proc.pmid,
    doi: proc.doi,
    title: proc.title, // title of the article
    journal: {
      in_doaj: false,
      title: undefined,
      issn: undefined,
      eissn: undefined // do we want eissn separate from issn? for now just uses issn
    },
    publisher: undefined,
    confidence: 0, // 1 if matched on ID, 0.9 if title to 1 result, 0.7 if title to multiple results
    in_epmc: false, // set to true if found
    is_aam: false, // set to true if is an eupmc author manuscript
    is_oa: false, // set to true if eupmc or other source says is oa
    has_fulltext_xml: false, // set to true if oa and in epmc and can retrieve fulltext xml from eupmc rest API url
    licence: 'unknown', // what sort of licence this has - should be a string like "cc by"
    licence_source: 'unknown', // where the licence info came from
    romeo_colour: undefined, // the sherpa romeo colour
    embargo: undefined, // embargo data from romeo
    author: [], // eupmc author list if available (could look on other sources too?)
    //repositories: [], // where CORE says it is
    grants:[], // a list of grants, probably from eupmc for now
    provenance: [] // list of things that were done
  };
  
  // search eupmc by (in order) pmcid, pmid, doi, title
  // check epmc for the record https://github.com/CottageLabs/lantern-api/blob/develop/service/workflow.py#L294
  var identtypes = ['pmcid','pmid','doi','title'];
  var eupmc;
  for ( var i in identtypes ) {
    if ( eupmc === undefined ) {
      var st = identtypes[i];
      if ( proc[st] ) {
        var stt = st;
        if (stt === 'title') stt = 'search';
        if (stt === 'pmcid') stt = 'pmc';
        // TODO need to simplify the title to keywords?
        var res = CLapi.internals.use.europepmc[stt](proc[st]);
        if (res.data) {
          if (res.data.id) {
            // we retrieved one result
            eupmc = res.data;
            result.confidence = 1;
          } else if (stt === 'search' && res.total) {
            // we may have matched a result by title search
            eupmc = res.data[0];
            if (res.total === 1) {
              result.confidence = 0.9;
            } else if ( res.total < 5 ) {
              result.confidence = 0.8;
            } else if (res.total < 10) {
              result.confidence = 0.7;
            } else {
              result.confidence = 0.5;
            }
          }
        }
      }
    }
  }
  
  if (eupmc !== undefined) {
    if (eupmc.pmcid && !result.pmcid) {
      result.pmcid = eupmc.pmcid;
      result.provenance.push('Added PMCID from EUPMC');
    }
    if (eupmc.pmid && !result.pmid) {
      result.pmid = eupmc.pmid;
      result.provenance.push('Added PMID from EUPMC');
    }
    if (eupmc.doi && !result.doi) {
      result.doi = eupmc.doi;
      result.provenance.push('Added DOI from EUPMC');
    }
    if (eupmc.title && !result.title) {
      result.title = eupmc.title;
      result.provenance.push('Added article title from EUPMC');
    }
    if (eupmc.inEPMC === 'Y') {
      result.in_epmc = true;
      result.provenance.push('Confirmed is in EUPMC');
    }
    if (eupmc.isOpenAccess === 'Y') {
      result.is_oa = true;
      result.provenance.push('Confirmed is open access from EUPMC');
    }
    if (eupmc.journalInfo && eupmc.journalInfo.journal ) {
      if ( eupmc.journalInfo.journal.title ) {
        result.journal.title = eupmc.journalInfo.journal.title; // completes oacwellcome issue 93
        result.provenance.push('Added journal title from EUPMC');
      }
      if ( eupmc.journalInfo.journal.essn) {
        result.journal.eissn = eupmc.journalInfo.journal.essn;
        result.provenance.push('Added eissn from EUPMC');
      }
      if ( eupmc.journalInfo.journal.issn ) {
        result.journal.issn = eupmc.journalInfo.journal.issn;
        result.provenance.push('Added issn from EUPMC');
      }
    }
    if (eupmc.grantsList && eupmc.grantsList.grant) {
      result.grants = eupmc.grantsList.grant;
      result.provenance.push('Added grants data from EUPMC');
    }
    // some dates that wellcome want - dateofpublication appears to be what they prefer
    //if (eupmc.journalInfo && eupmc.journalInfo.printPublicationDate) result.journal.printPublicationDate = eupmc.journal.printPublicationDate;
    if (eupmc.journalInfo && eupmc.journalInfo.dateOfPublication) {
      result.journal.dateOfPublication = eupmc.journalInfo.dateOfPublication;
      result.provenance.push('Added date of publication from EUPMC');
    }
    if (eupmc.electronicPublicationDate) {
      result.electronicPublicationDate = eupmc.electronicPublicationDate;
      result.provenance.push('Added electronic publication date from EUPMC');
    }
    var ft;
    if (result.is_oa && result.in_epmc) ft = CLapi.internals.use.europepmc.fulltextXML(undefined,eupmc);
    if (ft) {
      result.has_fulltext_xml = true;
      result.provenance.push('Confirmed fulltext XML is available from EUPMC');
    }
    if (eupmc.license) {
      result.licence = eupmc.license; // only the OA ones appear to have this, it says something like "cc by"
      result.licence_source = 'eupmc';
      result.provenance.push('Added licence from EUPMC');
    }
    if (eupmc.authorList.author) {
      result.author = eupmc.authorList.author; // auhtor list for oacwellcome issue 92 - full list in order, one entire list per cell
      result.provenance.push('Added author list from EUPMC');
    }
    result.is_aam = CLapi.internals.use.europepmc.authorManuscript(undefined,eupmc);
    result.provenance.push('Checked author manuscript status in EUPMC');
  }

  if (result.doi) {
    var crossref = CLapi.internals.use.crossref.works.doi(result.doi);
    if (crossref.status === 'success') {
      var c = crossref.data;
      result.confidence = 1;
      result.publisher = c.publisher; // completes oacwellcome issue 90
      result.provenance.push('Added publisher name from Crossref');
      if (!result.journal.issn && c.ISSN && c.ISSN.length > 0) {
        result.journal.issn = c.ISSN[0];
        result.provenance.push('Added ISSN from Crossref');
      }
      if (!result.journal.title && c['container-title'] && c['container-title'].length > 0) {
        result.journal.title = c['container-title'][0];
        result.provenance.push('Added journal title from Crossref');
      }
      if (!result.author && c.author) {
        result.author = c.author; // format like eupmc author list?
        result.provenance.push('Added author list from Crossref');
      }
      if (!result.title && c.title && c.title.length > 0) {
        result.title = c.title[0]; 
        result.provenance.push('Added article title from Crossref');
      }
    }
    
    // look up core to see if it is in there (in fulltext or not?) - only going to do for those with a DOI?
    // Which repositories, according to CORE, is the article in (or can we use BASE / dissemin instead?)
    /*var core = CLapi.internals.use.core.articles.doi(result.doi);
    if (core.data && core.data.id) {
      var cc = core.data;
      if (!result.author && cc.authors) result.author = cc.author; // format like eupmc author list?      
      if (cc.repositories && cc.repositories.length > 0) {
        for ( var ci in cc.repositories ) result.repositories.push(cc.repositories[ci].name);
      }
      if (!result.title && cc.title) result.title = cc.title;
      // anything useful from fulltextUrls key?
      // can is_oa be inferred from being in CORE? probably not reliably... 
      // maybe if has any fulltextUrls it is, but some don't have such URLs even if they clearly should exist
    }*/
  }

  if ( result.journal.issn ) {
    // is it in doaj
    var doaj = CLapi.internals.use.doaj.journals.issn(result.journal.issn);
    if (doaj.status === 'success') {
      result.journal.in_doaj = true;
      result.provenance.push('Confirmed journal is listed in DOAJ');
      if (!result.publisher && doaj.data.bibjson.publisher) result.publisher = doaj.data.bibjson.publisher;
      if (!result.journal.title && doaj.data.bibjson.title) result.journal.title = doaj.data.bibjson.title;
    } else {
      result.provenance.push('Could not find journal in DOAJ');      
    }
    
    // what are the policies from sherpa romeo
    var romeo = CLapi.internals.use.sherpa.romeo.search({issn:result.journal.issn});
    if ( romeo.status === 'success') {
      var journal, publisher;
      try {
        journal = romeo.data.journals[0].journal[0];
      } catch(err) {} // sometimes there is no publisher info in romeo, so adding this catch too just in case there is ever no journal info...
      try {
        publisher = romeo.data.publishers[0].publisher[0];
      } catch(err) {}
      // it is possible to have no publisher info, so catch the error
      // see http://www.sherpa.ac.uk/romeo/api29.php?ak=Z34hA6x7RtM&issn=1941-2789&
      if (!result.journal.title && journal && journal.jtitle && journal.jtitle.length > 0) {
        result.journal.title = journal.jtitle[0];
        result.provenance.push('Added journal title from Sherpa Romeo');
      }
      if (!result.publisher && publisher && publisher.name && publisher.name.length > 0) {
        result.publisher = publisher.name[0];
        result.provenance.push('Added publisher from Sherpa Romeo');
      }
      if (publisher) result.romeo_colour = publisher.romeocolour[0];
      result.embargo = ''; // which parts do we want from embargo data?
      result.provenance.push('Added embargo data from Sherpa Romeo');
      // can we infer licence or is_oa from sherpa data?
    }
  }
  
  // if license could not be found yet, call academic/licence to get info from the splash page
  if (!result.licence) {
    var url;
    if (result.doi) {
      url = CLapi.internals.academic.doiresolve(result.doi);
    } else if ( result.pmcid ) {
      url = 'http://europepmc.org/articles/PMC' + result.pmcid; // TODO CHECK - is epmc page what we want, or should we resolve this to journal splash?
    } else if ( result.pmid ) {
      url = CLapi.internals.academic.resolve('pmid' + result.pmid).url; // PMIDs may not be open, so really need to check full urls list
    }
    if (url && url.length > 1) {
      var lic = CLapi.internals.academic.licence(url,false);
      if (lic.licence && lic.licence !== 'unknown') {
        result.licence = lic.licence;
        result.licence_source = lic.resolved;
        result.provenance.push('Added licence data via article splash page lookup (used to be OAG)');
      } else {
        result.provenance.push('Unable to retrieve licence data via article splash page lookup (used to be OAG)');    
      }
    }
  }
  
  lantern_results.insert(result); // make sure it sets the result with the id of the process, added above
  lantern_processes.remove(proc._id);

  return result; // return result or just confirm process is done?
}
CLapi.internals.service.lantern.nextProcess = function() {
  // search for processes not already processing, sorted by descending created data
  // add any sort of priority queue checking?
  var p = lantern_processes.findOne({processing:{$not:{$eq:true}}},{limit:1,sort:{createdAt:-1}});
  if (p) {
    console.log(p._id);
    return CLapi.internals.service.lantern.process(p._id);
  } else {
    console.log('No lantern processes available');
    return false
  }
}

CLapi.internals.service.lantern.progress = function(jobid) {
  // given a job ID, find out how many of the identifiers in the job we have an answer for
  // return a percentage figure for how many have been done
  var job = lantern_jobs.findOne(jobid);
  if (job) {
    var update;
    if (job.done) {
      return 100;
    } else {
      var total = job.list.length;
      var count = 0;
      for ( var i in job.list ) {
        var pi = job.list[i];
        if ( pi.result ) {
          count += 1;
        } else {
          var found = lantern_results.findOne(pi.process);
          if (!found) {
            found = lantern_results.findByIdentifier(pi);
          }
          if ( found ) {
            count += 1;
            pi.result = found._id;
            update = true;
          }
        }
      }
      var p = count/total * 100;
      if ( update && p === 100 ) {
        lantern_jobs.update(job._id, {$set:{list:job.list,done:true}});
      } else if ( update ) {
        lantern_jobs.update(job._id, {$set:{list:job.list}});        
      } else if ( p === 100 ) {
        lantern_jobs.update(job._id, {$set:{done:true}});
      }
      return p;
    }
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.todo = function(jobid) {
  // given a job ID, return the parts still to do
  var job = lantern_jobs.findOne(jobid);
  if (job) {
    if (job.done) {
      return [];
    } else {
      var todos = [];
      for ( var i in job.list ) {
        if ( job.list[i].result === undefined ) todos.push(job.list[i]);
      }
      return todos;
    }
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.results = function(jobid,uid) {
  // for a job, get all the results for it and return them as an object
  var job = lantern_jobs.findOne(jobid);
  if (job) {
    var update;
    var results = [];
    for ( var i in job.list ) {
      var ji = job.list[i];
      var found;
      if (ji.result) {
        found = lantern_results.findOne(ji.result);
      } else {
        found = lantern_results.findOne(ji.process);
        if (found) {
          job.list[i].result = found._id;
          update = true;
        }
      }
      if ( found ) {
        for ( var lf in ji) {
          if (!found[lf]) found[lf] = ji[lf];
        }
        results.push(CLapi.internals.service.lantern.format(found,uid));
      }
    }
    if (update) lantern_jobs.update(job._id, {$set:{list:job.list}});
    return results;
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.result = function(resultid,identifier,type) {
  var found;
  if ( resultid !== undefined ) {
    found = lantern_results.findOne(resultid);
  } else if (identifier) {
    var m = {};
    m[type] = identifier;
    found = lantern_results.findOne(m);
  }
  if ( found ) {
    // some users will only get certain parts of results, depending on their permissions
    return found;
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.format = function(result,uid) {
  // formatting of results should depend on the user and their group affiliations
  // but for now... just make it all wellcome  
  var s = {
    doi:'DOI',
    pmcid:'PMCID',
    pmid: 'PMID',
    publisher: 'Publisher',
    title: 'Article title',
    licence: 'Licence',
    in_epmc: 'Fulltext in EPMC?',
    has_fulltext_xml: 'XML Fulltext?',
    is_aam: 'Author Manuscript?',
    is_oa: 'Open Access?',
    confidence: 'Correct Article Confidence',
    licence_source: 'Licence source',
    romeo_colour: false,
    embargo: false,
    createdAt: false,
    process: false,
    result: false,
    '_id': false // these listed to false just get removed from output
  }
  result['Standard Compliance?'] = 'FALSE';
  result['Deluxe Compliance?'] = 'FALSE';
  var lic = result.licence.toLowerCase().replace(/ /g,'');
  if (result.in_epmc === true && (result.is_aam || lic === 'ccby')) result['Standard Compliance?'] = 'TRUE';
  if (result.in_epmc && result.is_aam) result['Deluxe Compliance?'] = 'TRUE';
  if (result.in_epmc && result.licence_source === 'eupmc' && lic === 'ccby' && result.is_oa) result['Deluxe Compliance?'] = 'TRUE';
  if ( result.provenance ) {
    result['Compliance Processing Output'] = '';
    var fst = true;
    for ( var p in result.provenance ) {
      if (fst) {
        fst = false;
      } else {
        result['Compliance Processing Output'] += '\r\n';
      }
      result['Compliance Processing Output'] += result.provenance[p];
    }
    delete result.provenance;
  }
  if (result.electronicPublicationDate !== undefined) {
    result['Electronic Publication Date'] = result.electronicPublicationDate;
    delete result.electronicPublicationDate;
  } else {
    result['Electronic Publication Date'] = 'Unavailable';  
  }
  result['Publication Date'] = 'Unavailable';
  if ( result.journal ) {
    if (result.journal.dateOfPublication !== undefined) result['Publication Date'] = result.journal.dateOfPublication;
    result['Journal title'] = result.journal.title;
    result.ISSN = result.journal.issn;
    if (result.journal.eissn) result.ISSN += ', ' + result.journal.eissn;
    if ( result.journal.in_doaj === true ) {
      result['Journal Type'] = 'open';
    } else {
      result['Journal Type'] = 'hybrid';
    }
    delete result.journal;
  }
  if ( result.author ) {
    result['Author(s)'] = '';
    var first = true;
    for ( var r in result.author ) {
      if (first) {
        first = false;
      } else {
        result['Author(s)'] += ', ';
      }
      var ar = result.author[r];
      if ( ar.fullName ) result['Author(s)'] += ar.fullName;
      //if ( ar.affiliation) result['Author(s)'] += ' - ' + ar.affiliation; disabled by request of Cecy
      // TODO add some more IFs here depending on author structure, unless altered above to match eupmc structure
    }
    delete result.author;
  }
  if ( result.grants ) {
    var grants = [];
    for ( var w in result.grants) {
      var g = result.grants[w];
      if (g.agency.toLowerCase().indexOf('wellcome') !== -1) {
        grants.unshift(g);
      } else {
        grants.push(g);
      }
    }
    for ( var gr in grants ) {
      if (grants[gr] !== undefined) {
        result['Grant ' + (parseInt(gr)+1)] = grants[gr].grantId;
        result['Agency ' + (parseInt(gr)+1)] = grants[gr].agency;
      }
    }
    delete result.grants;
  }
  for ( var key in result ) {
    if ( result[key] === true ) result[key] = 'TRUE';
    if ( result[key] === false ) result[key] = 'FALSE';
    if ( result[key] === undefined ) result[key] = 'unknown';
    if ( result[key] === null ) result[key] = 'unknown';
    if ( s[key] !== undefined ) {
      if (s[key] !== false) result[s[key]] = result[key];
      delete result[key];
    }
  }
  return result;
  
}

if ( Meteor.settings.cron.lantern ) {
  SyncedCron.add({
    name: 'lantern',
    schedule: function(parser) { return parser.recur().every(1).second(); },
    job: CLapi.internals.service.lantern.nextProcess
  });
}
SyncedCron.start(); // where should the cron starter go in the API code? - a generic startup section somewhere?




