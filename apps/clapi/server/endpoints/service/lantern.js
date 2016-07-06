
// TODO for lantern
// re-point the lantern.cottagelabs.com to the new lantern UI
// enable login (also needed for monitor, plus decision on how to create new accounts for monitor use)
// lantern user monthly row count - max 25 rows per 30 days - and throw an error when over rate
// lantern output format

// web-hook - could add to the API the ability to add a URL as a web-hook, so when a job is submitted with that URL, 
// we ping a GET to the URL provided

/*
All outgoing calls COULD be cached - europepmc, crossref, core, sherpa, doaj, pubmed - but currently are not
Grist is currently not, but perhaps SHOULD be
academic/resolve currently only caches full lookup - change it to cache DOI lookups too
*/

// The Lantern API
lantern_jobs = new Mongo.Collection("lantern_jobs"); // batches of submitted jobs from users
lantern_processes = new Mongo.Collection("lantern_processes"); // individual processes of ident object sets {doi:"blah",pmid:"same"}
lantern_results = new Mongo.Collection("lantern_results"); // results for particular identifiers
// There can be more than one result for an identified paper, because they are re-run if outwith acceptable time limit

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
  var m = [];
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});
  if (m.length === 0) {  // causes a Mongo error otherwise, since Mongo does not like $or: [] in the queries below
    return undefined;
  }
  return lantern_processes.findOne({$or: m});
}
lantern_results.findByIdentifier = function(idents,refresh) {  
  var m = [];
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});

  if (m.length === 0) {  // causes a Mongo error otherwise, since Mongo does not like $or: [] in the queries below
    return undefined;
  }

  var s = {};
  if (refresh) {
    var d = new Date();
    var t = d.setDate(d.getDate() - refresh);
    s.$and = [{$or:m},{createdAt:{$gte:t}}];
  } else {
    s.$or = m;
  }
  return lantern_results.findOne(s,{sort:{createdAt:-1}});
}
lantern_results.findFreshById = function(id,refresh) {  
  var d = new Date();
  var t = d.setDate(d.getDate() - refresh);
  return lantern_results.findOne({$and:[{'_id':id},{createdAt:{$gte:t}}]},{sort:{createdAt:-1}});
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
    var maxallowedlength = 3000; // this could be in config or a per user setting...
    var checklength = this.request.body.list ? this.request.body.list.length : this.request.body.length;
    var email = this.request.body.email ? this.request.body.email : '';
    var quota = CLapi.internals.service.lantern.quota(email);
    // TODO should partial jobs be accepted, up to remaining quota available / max length?
    // for now jobs that are too big are refused
    if (checklength > maxallowedlength) {
      return {statusCode: 413, body: {status: 'error', data: {length: checklength, max: maxallowedlength, info: checklength + ' too long, max rows allowed is ' + maxallowedlength}}}
    } else if (checklength > quota.available) {
      return {statusCode: 413, body: {status: 'error', data: {length: checklength, quota: quota, info: checklength + ' greater than remaining quota ' + quota.available}}}
    } else {
      var j = CLapi.internals.service.lantern.job(this.request.body,this.userId,this.queryParams.refresh);
      return {status: 'success', data: {job:j,quota:quota, max: maxallowedlength, length: checklength}};
    }
  }
});

CLapi.addRoute('service/lantern/:job', {
  get: {
    action: function() {
      // return the info of the job - the job metadata and the progress so far
      var job = lantern_jobs.findOne(this.urlParams.job);
      if (job) {
        var p = CLapi.internals.service.lantern.progress(this.urlParams.job);
        job.progress = p ? p : 0;
        return {status: 'success', data: job}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('service/lantern/:job/reload', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.reload(this.urlParams.job) }
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
      var job = lantern_jobs.findOne(this.urlParams.job);
      // TODO may add restriction on how long old jobs can be returned for 
      // could be implemented by deleting them, or by checking here for how long the user can 
      // retrieve jobs (to be saved in a user config)
      if (!job) return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      
      var res;
      if ( this.queryParams.format && this.queryParams.format === 'csv' ) {
        var format = job.user ? 'lantern' : 'wellcome'; // format should be derived by the user that is calling this
        res = CLapi.internals.service.lantern.results(this.urlParams.job,format);
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
          'PMCID','PMID','DOI','Publisher','Journal title','ISSN',
          'Article title','Publication Date','Electronic Publication Date',
          'Author(s)'
        ];
        if (job.list && job.list.length > 0) {
          if (job.list[0].University !== undefined) fields.unshift('University');
          var ffields = [
            'Title of paper (shortened)',
            'Grant References','Total cost of Article Processing Charge (APC), in £',
            'Amount of APC charged to Wellcome OA grant, in £ (see comment)','VAT charged',
            'COST (£)','Wellcome grant','licence info','Notes'
          ];
          for ( var fld in ffields) {
            if (job.list[0][ffields[fld]] !== undefined) fields.push(ffields[fld]);
          }
        }

        if (format !== 'wellcome') {
          fields.push('In CORE?');
          fields.push('Archived repositories');
        }

        fields = fields.concat([
          'Fulltext in EPMC?','XML Fulltext?','Author Manuscript?','Ahead of Print?',
          'Open Access?'
        ]);

        if (format === 'wellcome') {
          fields.push('EPMC Licence');
          fields.push('EPMC Licence source');
          fields.push('Publisher Licence');
        } else {
          fields.push('Licence');
          fields.push('Licence source');
        }

        fields = fields.concat([
          'Journal Type','Correct Article Confidence'
        ]);

        if (format === 'wellcome') {
          fields.push('Standard Compliance?');
          fields.push('Deluxe Compliance?');
        } else {
          fields.push('Preprint Embargo');
          fields.push('Preprint Self-archiving Policy');
          fields.push('Postprint Embargo');
          fields.push('Postprint Self-archiving Policy');
          fields.push('Publishers Copy Embargo');
          fields.push('Publishers Copy Self-archiving Policy');
        }

        if (format === 'wellcome') {
          fields.push('Compliance Processing Output');
        }

        for ( var gi=0; gi < grantcount; gi++) {
          fields.push('Grant ' + (parseInt(gi)+1));
          fields.push('Agency ' + (parseInt(gi)+1));
          fields.push('PI ' + (parseInt(gi)+1));
        }
        if (format !== 'wellcome') {
          fields.push('Provenance');          
        }
        var ret = CLapi.internals.convert.json2csv({fields:fields},undefined,res);
        var name = 'results';
        if (job.name) name = job.name.split('.')[0].replace(/ /g,'_') + '_results';
        this.response.writeHead(200, {
          'Content-disposition': "attachment; filename="+name+".csv",
          'Content-type': 'text/csv',
          'Content-length': ret.length
        });
        this.response.write(ret);
        this.done();
        return {}  
      } else {
        res = CLapi.internals.service.lantern.results(this.urlParams.job);
        return {status: 'success', data: res}
      }
    }
  }
});

CLapi.addRoute('service/lantern/:job/original', {
  get: {
    action: function() {
      // wellcome found it useful to be able to download the original file, 
      // so this route should just find the job and return the file without any results
      var job = lantern_jobs.findOne(this.urlParams.job);
      var fl = [];
      for ( var j in job.list ) {
        var jb = job.list[j];
        if (jb.process) delete jb.process;
        //if (jb.result) delete jb.result;
        if (jb.doi !== undefined) jb.DOI = jb.doi;
        delete jb.doi;
        if (jb.pmcid !== undefined) jb.PMCID = jb.pmcid;
        delete jb.pmcid;
        if (jb.pmid !== undefined) jb.PMID = jb.pmid;
        delete jb.pmid;
        if (jb.title !== undefined) jb['Article title'] = jb.title;
        delete jb.title;
        fl.push(jb);
      }
      //return fl;
      var ret = CLapi.internals.convert.json2csv(undefined,undefined,fl);
      var name = 'original';
      if (job.name) name = job.name.split('.')[0].replace(/ /g,'_');
      this.response.writeHead(200, {
        'Content-disposition': "attachment; filename="+name+"_original.csv",
        'Content-type': 'text/csv',
        'Content-length': ret.length
      });
      this.response.write(ret);
      this.done();
      return {}
    }
  }
});

CLapi.addRoute('service/lantern/result/:res', {
  get: {
    action: function() {
      // find and return the result - could just expose the collection?
    }
  }
});

CLapi.addRoute('service/lantern/jobs', {
  get: {
    action: function() {
      var results = [];
      var jobs = lantern_jobs.find();
      jobs.forEach(function(job) {
        job.processes = job.list.length;
        delete job.list;
        results.push(job);
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
    }
  }
});

CLapi.addRoute('service/lantern/jobs/reload', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.reload() }
    }
  }
});

CLapi.addRoute('service/lantern/jobs/:email', {
  get: {
    action: function() {
      var results = [];
      var jobs = lantern_jobs.find({email:this.urlParams.email});
      jobs.forEach(function(job) {
        job.processes = job.list.length;
        delete job.list;
        results.push(job);
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
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

CLapi.addRoute('service/lantern/status', {
  get: {
    action: function() {
      return {
        status: 'success', 
        data: CLapi.internals.service.lantern.status()
      }
    }
  }
});

CLapi.addRoute('service/lantern/quota/:email', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.quota(this.urlParams.email) }
    }
  }
});

CLapi.internals.service.lantern = {};

CLapi.internals.service.lantern.quota = function(email) {
  var acc = Meteor.users.findOne({'emails.address':email});
  var max = 100;
  var admin = acc !== undefined ? CLapi.cauth('lantern.admin',acc) : false;
  var premium = acc !== undefined ? CLapi.cauth('lantern.premium',acc,false ) : false;
  // for now if no acc assume wellcome user and set max huge
  if (acc === undefined) {
    max = 100000;
  } else if ( admin ) {
    max = 500000;
  } else if ( premium ) {
    max = 5000;
  }
  var backtrack = 30;
  var additional = 0;
  var today = Date.now();
  var until = false;
  var display = false;
  if (acc && acc.service && acc.service.lantern && acc.service.lantern.additional) {
    for ( var a in acc.service.lantern.additional ) {
      var ad = acc.service.lantern.additional[a];
      if ( ad.until > today ) {
        additional = ad.quota;
        display = ad.display;
        until = ad.until;
      } else if ( ((ad.until/1000)+(30*86400))*1000 > today ) {
        // set the backtrack date, so only counts old jobs run after the last additional quota expired
        // essentially provides a reset on job quota max after an additional quota is purchased and runs out, 
        // even if the standard quota max was used as well as the additional quota, within the last 30 days.
        // so a wee bit of a bonus - but then, if someone pays for an additional quota one assumes they intend to use all the standard max anyway
        backtrack = ((30*86400) - (ad.until/1000) - (today/1000));
      }
    }
  }
  var count = 0;
  var d = new Date();
  var t = d.setDate(d.getDate() - backtrack);
  var j = lantern_jobs.find({$and:[{email:email},{createdAt:{$gte:t}}]},{sort:{createdAt:-1}});
  j.forEach(function(job) { count += job.list.length; });
  var available = max - count + additional;
  return {
    admin: admin,
    premium: premium,
    additional: additional,
    until: until,
    display: display,
    email: email,
    count: count,
    max: max,
    available: available,
    allowed: available>0
  }
}

CLapi.internals.service.lantern.status = function() {
  return {
    processes: {
      total: lantern_processes.find().count(),
      running: lantern_processes.find({processing:{$exists:true}}).count()
    },
    jobs: {
      total: lantern_jobs.find().count(),
      done: lantern_jobs.find({done:{$exists:true}}).count()
    },
    results: lantern_results.find().count(),
    users: CLapi.internals.accounts.count({"roles.lantern":{$exists:true}})
  } 
}

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

CLapi.internals.service.lantern.reload = function(jobid) {
  // reload all jobs with processes that still need running
  var ret = 0;
  var j = jobid ? lantern_jobs.find({'_id':jobid}) : lantern_jobs.find({done:{$not:{$eq:true}}});
  j.forEach(function(job) {
    for ( var l in job.list) {
      var pid = job.list[l].process;
      // couple of lines just to check for jobs created in the old way
      if (job.list[l].process === undefined && job.list[l].result !== undefined) {
        pid = job.list[l].result;
        var s = {};
        s["list."+l+".process"] = job.list[l].result;
        lantern_jobs.update(job._id,{$set:s});
      }
      var proc = lantern_processes.findOne(pid);
      var res;
      if (!proc) res = lantern_results.findOne(pid);
      if (pid && !proc && !res) {
          lantern_processes.insert({'_id':pid,doi:j.doi,pmcid:j.pmcid,pmid:j.pmid,title:j.title,refresh:job.refresh});
          ret += 1;
      }
    }
  });
  return ret;
}

// Lantern submissions create a trackable job
// accepts list of articles with one or some of doi,pmid,pmcid,title
CLapi.internals.service.lantern.job = function(input,uid,refresh) {
  // is there a limit on how long the job list can be? And is that limit controlled by user permissions?
  var user;
  var job = {};
  if (input.email) {
    job.email = input.email;
    if (!uid) {
      user = Meteor.users.findOne({"emails.address":input.email});
      if (user) job.user = user._id;
    }
  }
  if (uid) {
    user = Meteor.users.findOne(uid);
    job.email = user.emails[0].address;
    job.user = uid;
  }
  // for now if no uid assume a wellcome user in which case refresh needs to be set to 1
  // should really be a check on the user setting, and/or the refresh number already passed in from the request
  if (!user) refresh = 1;
  if (refresh !== undefined) job.refresh = refresh;
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
      delete list[i].PMCID;
    }
    if ( j.TITLE ) {
      list[i].title = j.TITLE;
      delete list[i].TITLE;
    }
    if ( j['Article title'] ) {
      list[i].title = j['Article title'];
      delete list[i]['Article title'];
    }
    if (j.title) j.title = j.title.replace(/\s\s+/g,' ').trim();
    if (j.pmcid) j.pmcid = j.pmcid.replace(/[^0-9]/g,'');
    if (j.pmid) j.pmid = j.pmid.replace(/[^0-9]/g,'');
    if (j.doi) j.doi = j.doi.replace(/ /g,''); // also translate from url encoding? Saw one from wellcome with a %2F in it...
    var proc = {doi:j.doi,pmcid:j.pmcid,pmid:j.pmid,title:j.title,refresh:refresh};
    var result = lantern_results.findByIdentifier(proc,refresh);
    if (result) {
      job.list[i].process = result._id;
    } else {
      var process = lantern_processes.findByIdentifier(proc);
      process ? job.list[i].process = process._id : job.list[i].process = lantern_processes.insert(proc);
    }
  }
  var jid = lantern_jobs.insert(job);
  if (job.email) {
    var jor = job.name ? job.name : jid;
    var text = 'Hi ' + job.email + '\n\nThanks very much for submitting your processing job ' + jor + '.\n\n';
    text += 'You can track the progress of your job at ';
    // TODO this bit should depend on user group permissions somehow
    // for now we assume if a signed in user then lantern, else wellcome
    text += user ? 'https://lantern.cottagelabs.com#' : 'https://compliance.cottagelabs.com#';
    text += jid;
    text += '\n\nThe Cottage Labs team\n\n';
    text += 'P.S This is an automated email, please do not reply to it.'
    CLapi.internals.sendmail({
      to:job.email,
      subject:'Job ' + jor + ' submitted successfully',
      text:text
    });
  }
  return jid;
}

CLapi.internals.service.lantern.process = function(processid) {
  // process a job from the lantern_processes job list
  /*var proc;
  if ( processid !== undefined ) {
    proc = lantern_processes.findOne(processid);
  } else {
    return false;
  }
  var result = lantern_results.findByIdentifier(proc);
  if (result) {
    lantern_processes.remove(proc._id);
    return result;
  } else {
    proc.processing = true;
    lantern_processes.update(proc._id, {$set:{processing:true}});
  }*/

  var proc = lantern_processes.findOne(processid);
  if (!proc) return false;
  lantern_processes.update(proc._id, {$set:{processing:true}});

  // the result object to build, all the things we want to know
  var result = {
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
    aheadofprint: undefined, // if pubmed returns a date for this, it will be a date
    has_fulltext_xml: false, // set to true if oa and in epmc and can retrieve fulltext xml from eupmc rest API url
    licence: 'unknown', // what sort of licence this has - should be a string like "cc-by"
    epmc_licence: 'unknown', // the licence in EPMC, should be a string like "cc-by"
    licence_source: 'unknown', // where the licence info came from
    epmc_licence_source: 'unknown', // where the EPMC licence info came from (fulltext xml, EPMC splash page, etc.)
    romeo_colour: undefined, // the sherpa romeo colour
    embargo: undefined, // embargo data from romeo
    archiving: undefined, // sherpa romeo archiving data
    author: [], // eupmc author list if available (could look on other sources too?)
    in_core: 'unknown',
    repositories: [], // where CORE says it is
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
        var prst = proc[st];
        if (stt === 'title') {
          stt = 'search';
          prst = 'TITLE:' + prst.replace(/[A-Za-z0-9]/g,' ');
        }
        if (stt === 'pmcid') stt = 'pmc';
        // TODO need to simplify the title to keywords?
        var res = CLapi.internals.use.europepmc[stt](prst);
        if (res.data) {
          if (res.data.id) {
            // we retrieved one result
            eupmc = res.data;
            result.confidence = 1;
          } else if (stt === 'search' && res.total) {
            // we may have matched a result by title search
            // sometimes even exact title match comes way down the eupmc results list. See:
            // http://dev.api.cottagelabs.com/use/europepmc/search/TITLE:The%20therapeutic%20potential%20of%20allosteric%20ligands%20for%20free%20fatty%20acid%20sensitive%20GPCRs
            // so have to loop the results, but better limit it to some degree
            if (res.total === 1) {
              eupmc = res.data[0];
              result.confidence = 0.9;
            } else {
              for ( var e = 0; e < 50; e++) {
                if (res.data[e] && res.data[e].title) {
                  var diff = CLapi.internals.tdm.levenshtein(prst.toLowerCase().replace(' ',''),res.data[e].title.toLowerCase().replace(/[A-Za-z0-9]/g,''));
                  if ( diff === 0 ) {
                    eupmc = res.data[e];
                    result.confidence = 0.9;
                  } else if (diff < 3) {
                    eupmc = res.data[e];
                    result.confidence = (9-diff)/10;                  
                  }
                }
              }
              if (eupmc === undefined && res.data.length > 0) {
                eupmc = res.data[0];
                result.confidence = 0.5;
              }
            }
          }
        }
      }
    }
  }
  
  if (eupmc !== undefined) {
    if (eupmc.pmcid && result.pmcid !== eupmc.pmcid) {
      result.pmcid = eupmc.pmcid;
      result.provenance.push('Added PMCID from EUPMC');
    }
    if (eupmc.pmid && result.pmid !== eupmc.pmid) {
      result.pmid = eupmc.pmid;
      result.provenance.push('Added PMID from EUPMC');
    }
    if (eupmc.doi && result.doi !== eupmc.doi) {
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
    if (!ft && result.pmcid) { ft = CLapi.internals.use.europepmc.fulltextXML(result.pmcid); }
    if (ft) {
      result.has_fulltext_xml = true;
      result.provenance.push('Confirmed fulltext XML is available from EUPMC');
    }
    var lic = CLapi.internals.use.europepmc.licence(result.pmcid,eupmc,ft);
    if (lic !== false) {
      result.licence = lic.licence;
      result.epmc_licence = lic.licence;
      result.licence_source = lic.source;
      result.epmc_licence_source = lic.source;
      var extrainfo = '';
      if (lic.matched) {extrainfo += ' The bit that let us determine the licence was: ' + lic.matched + ' .';}
      if (lic.matcher) {extrainfo += ' If licence statements contain URLs we will try to find those in addition to ' +
        'searching for the statement\'s text. Here the entire licence statement was: ' + lic.matcher + ' .';}
      result.provenance.push('Added EPMC licence from ' + lic.source + '.' + extrainfo);

      // result.licence and result.licence_source can be overwritten later by
      // the academic licence detection (what OAG used to do), but we will keep the
      // EPMC information separately.
    }
    if (eupmc.authorList && eupmc.authorList.author) {
      result.author = eupmc.authorList.author;
      result.provenance.push('Added author list from EUPMC');
    }
    if (result.in_epmc) {
      var aam = CLapi.internals.use.europepmc.authorManuscript(result.pmcid,eupmc);
      if (aam !== false) {
        result.is_aam = true;
        result.provenance.push('Checked author manuscript status in EUPMC, returned ' + aam);
      } else {
        result.provenance.push('Checked author manuscript status in EUPMC, found no evidence of being one');      
      }
    }
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
    
    // look up core to see if it is in there (in fulltext or not?)
    // should we use BASE / dissemin as well / instead?)
    if (result.doi) {
      var core = CLapi.internals.use.core.articles.doi(result.doi);
      if (core.data && core.data.id) {
        result.in_core = true;
        result.provenance.push('Found DOI in CORE');
        var cc = core.data;
        if (!result.author && cc.authors) {
          result.author = cc.author; // format like eupmc author list?      
          result.provenance.push('Added authors from CORE');
        }
        if (cc.repositories && cc.repositories.length > 0) {
          for ( var ci in cc.repositories ) result.repositories.push(cc.repositories[ci].name); // add URL here - does not seem to be in CORE data
          result.provenance.push('Added repositories that CORE claims article is available from');
        }
        if (!result.title && cc.title) {
          result.title = cc.title;
          result.provenance.push('Added title from CORE');
        }
        // anything useful from fulltextUrls key?
        // can is_oa be inferred from being in CORE? probably not reliably... 
        // maybe if has any fulltextUrls it is, but some don't have such URLs even if they clearly should exist
      } else {
        result.in_core = false;
        result.provenance.push('Could not find DOI in CORE');
      }
    }
  }

  // use grist API from EUPMC to look up PI name of any grants present
  if ( result.grants.length > 0 ) {
    for ( var g in result.grants ) {
      var gr = result.grants[g];
      if (gr.grantId) {
        var grid = gr.grantId;
        if (gr.agency && gr.agency.toLowerCase().indexOf('wellcome') !== -1 ) {
          grid = grid.split('/')[0];
          console.log('Lantern simplified ' + gr.grantId + ' to ' + grid + ' for Grist API call');
        }
        var gres = CLapi.internals.use.grist.grant_id(grid);
        if (gres.total && gres.total > 0 && gres.data.Person) {
          var ps = gres.data.Person;
          var pid = '';
          if (ps.Title) pid += ps.Title + ' ';
          if (ps.GivenName) pid += ps.GivenName + ' ';
          if (!ps.GivenName && ps.Initials) pid += ps.Initials + ' ';
          if (ps.FamilyName) pid += ps.FamilyName;
          result.grants[g].PI = pid;
          result.provenance.push('Found Grant PI for ' + grid + ' via Grist API');
        }
      } else {
        result.provenance.push('Tried but failed to find Grant PI via Grist API');
      }
    }
  }
  
  if (result.pmid && !result.in_epmc) {
    result.aheadofprint = CLapi.internals.use.pubmed.aheadofprint(result.pmid);
    if (result.aheadofprint !== false) {
      result.provenance.push('Checked ahead of print status on pubmed, date found ' + result.aheadofprint);      
    } else {
      result.provenance.push('Checked ahead of print status on pubmed, no date found');
    }
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
      result.embargo = {preprint:false,postprint:false,pdf:false};
      result.archiving = {preprint:false,postprint:false,pdf:false};
      for ( var k in result.embargo ) {
        var main = k.indexOf('pdf') !== -1 ? k + 's' : 'pdfversion';
        var stub = k.replace('print','');
        if ( publisher && publisher[main]) {
          if (publisher[main][0][stub+'restrictions']) {
            for ( var p in publisher[main][0][stub+'restrictions'] ) {
              if (publisher[main][0][stub+'restrictions'][p][stub+'restriction']) {
                result.embargo[k] === false ? result.embargo[k] = '' : result.embargo[k] += ',';
                result.embargo[k] += publisher[main][0][stub+'restrictions'][p][stub+'restriction'][0].replace(/<.*?>/g,'');
              }
            }
          }
          if (publisher[main][0][stub+'archiving']) result.archiving[k] = publisher[k+'s'][0][stub+'archiving'][0];
        }
      }
      result.provenance.push('Added embargo and archiving data from Sherpa Romeo');
      // can we infer licence or is_oa from sherpa data?
    }
  }
  
  // if license could not be found yet, call academic/licence to get info from the splash page
  if (!result.licence || result.licence === 'unknown' || (result.licence != 'cc-by' && result.licence != 'cc-zero')) {
    result.publisher_licence_check_ran = true;
    console.log('Running publisher academic licence detection');
    var url;
    if (result.doi) {
      url = CLapi.internals.academic.doiresolve(result.doi);
    } else if ( result.pmcid ) {
      // TODO eupmc splash page would already be checked if necessary for anything with a pmcid
      // so this should only return a URL if we can resolve one to a non-eupmc page
      //url = 'http://europepmc.org/articles/PMC' + result.pmcid; 
    } else if ( result.pmid ) {
      // TODO need to check where resolve would resolve this to - need publisher page, NOT epmc page and probably not pubmed page either
      // PMIDs may not be open, so really need to check full urls list
      url = CLapi.internals.academic.resolve('pmid' + result.pmid).url;
    }
    if (url && url.length > 1) {
      var lic = CLapi.internals.academic.licence(url,false,undefined,undefined,undefined,true);
      if (lic.licence && lic.licence !== 'unknown') {
        result.licence = lic.licence;
        result.licence_source = 'publisher_splash_page';
        // TODO Wellcome with their split licence column ended up needing to know the publisher licence separately, but
        // this duplicates (some) information with the .licence result field, probably worth refactoring.
        result.publisher_licence = lic.licence;
        var extrainfo = '';
        if (lic.matched) {extrainfo += ' The bit that let us determine the licence was: ' + lic.matched + ' .';}
        if (lic.matcher) {extrainfo += ' If licence statements contain URLs we will try to find those in addition to ' +
          'searching for the statement\'s text. Here the entire licence statement was: ' + lic.matcher + ' .';}
        result.provenance.push('Added licence data via article publisher splash page lookup to ' + lic.resolved + ' (used to be OAG).' + extrainfo);
      } else {
        result.publisher_licence = 'unknown';
        result.provenance.push('Unable to retrieve licence data via article publisher splash page lookup (used to be OAG).');
      }
    }
  } else {
    result.publisher_licence_check_ran = false;
  }
  
  lantern_results.insert(result);
  lantern_processes.remove(proc._id);
  
  // update the lantern jobs containing any of the IDs in this process
  /*var jobs = lantern_jobs.find({"list.process":proc._id});
  jobs.forEach(function(job) {
    if (!job.done) {
      var update = false;
      var updates = {};
      for ( var i in job.list ) {
        if (job.list[i].process === proc._id) {
          update = true;
          updates["list." + i + ".result"] = proc._id;
        }
      }
      if (update) {
        lantern_jobs.update(job._id, {$set:updates});
      }
    }
  });*/

  return result; // return result or just confirm process is done?
}
CLapi.internals.service.lantern.nextProcess = function() {
  // search for processes not already processing, sorted by descending created data
  // add any sort of priority queue checking?
  var p = lantern_processes.findOne({processing:{$not:{$eq:true}}},{sort:{createdAt:-1}});
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
    var p;
    if (job.done) {
      p = 100;
    } else {
      //var update = false;
      //var updates = {};
      var total = job.list.length;
      var count = 0;
      for ( var i in job.list ) {
        /*if ( job.list[i].result ) {
          count += 1;
        } else if (check) {*/
        var found = lantern_results.findOne(job.list[i].process);
        // could add a check for OTHER results with similar IDs - but shouldn't be any, and would have to re-sanitise the IDs
        //if (!found) found = lantern_results.findByIdentifier(pi);
        if ( found ) {
          count += 1;
          //updates["list." + i + ".result"] = found._id;
          //update = true;
        }
        //}
      }
      p = count/total * 100;      
      if ( p === 100 ) {
        // this will only happen on first time the progress check finds job is 100% cos otherwise it returns 100 on seeing job.done
        //updates.done = true;
        //lantern_jobs.update(job._id, {$set:updates});
        lantern_jobs.update(job._id, {$set:{done:true}});
        var jor = job.name ? job.name : job._id;
        var text = 'Hi ' + job.email + '\n\nYour processing job ' + jor + ' is complete.\n\n';
        text += 'You can now download the results of your job at ';
        // TODO this bit should depend on user group permissions somehow
        // for now we assume if a signed in user then lantern, else wellcome
        text += job.user ? 'https://lantern.cottagelabs.com#' : 'https://compliance.cottagelabs.com#';
        text += job._id;
        text += '\n\nThe Cottage Labs team\n\n';
        text += 'P.S This is an automated email, please do not reply to it.'
        CLapi.internals.sendmail({
          to:job.email,
          subject:'Job ' + jor + ' completed successfully',
          text:text
        });
      }/* else if (update) {
        // this happens if the job has had some progress but is not yet 100%
        lantern_jobs.update(job._id, {$set:updates});
      }*/
    }
    return {progress:p,name:job.name,email:job.email,_id:job._id};
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
        if ( !lantern_results.findOne(job.list[i].process) ) todos.push(job.list[i]);
      }
      return todos;
    }
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.results = function(jobid,format) {
  // for a job, get all the results for it and return them as an object
  var job = lantern_jobs.findOne(jobid);
  if (job) {
    //var update;
    var results = [];
    for ( var i in job.list ) {
      var ji = job.list[i];
      //var found;
      //if (ji.result) {
      var found = lantern_results.findOne(ji.process);
    /*} else {
      found = lantern_results.findOne(ji.process);
      if (found) {
        job.list[i].result = found._id;
        update = true;
      }
    }*/
      if ( found ) {
        for ( var lf in ji) {
          if (!found[lf]) found[lf] = ji[lf];
        }
        if (format !== undefined) found = CLapi.internals.service.lantern.format(found,format);
        results.push(found);
      }
      //}
    }
    //if (update) lantern_jobs.update(job._id, {$set:{list:job.list}});
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
    // should some users only get certain parts of results, depending on their permissions?
    return found;
  } else {
    return false;
  }
}

var _formatwellcome = function(result) {
  var s = {
    doi:'DOI',
    pmcid:'PMCID',
    pmid: 'PMID',
    publisher: 'Publisher',
    title: 'Article title',
    publisher_licence: "Publisher Licence",
    epmc_licence: 'EPMC Licence',
    in_epmc: 'Fulltext in EPMC?',
    has_fulltext_xml: 'XML Fulltext?',
    is_oa: 'Open Access?',
    confidence: 'Correct Article Confidence',
    epmc_licence_source: 'EPMC Licence source',
    romeo_colour: false,
    embargo: false,
    archiving: false,
    in_core: false,
    repositories: false,
    createdAt: false,
    process: false,
    result: false,
    publisher_licence_check_ran: false,
    '_id': false // these listed to false just get removed from output
  };
  if (!result.publisher_licence_check_ran && result.publisher_licence !== 'unknown') {
    // Did we look up a separate licence on the publisher website? If so, we want to display it.
    // But if we've branched into here, then we did not do a separate look up
    // (i.e. we were happy with EPMC results). So the "Publisher Licence" column should say "not applicable".

    // There is one exception: if we did a publisher site licence lookup but got nothing, then obviously
    // Publisher Licence is applicable, and should say "unknown". We don't want to change an "unknown" into a
    // "not applicable".
    result.publisher_licence = "not applicable";
  }
  if (result.publisher_licence === undefined) {
    result.publisher_licence = 'unknown';
  }
  if (!result.in_epmc) {
    result['Author Manuscript?'] = "not applicable";
  } else if (result.is_aam) {
    result['Author Manuscript?'] = "TRUE";
  } else {
    result['Author Manuscript?'] = "FALSE";
  }
  if (result.aheadofprint === false) {
    result['Ahead of Print?'] = 'FALSE';
  } else if (result.aheadofprint) {
    result['Ahead of Print?'] = 'TRUE';
  } else if ( !result.in_epmc && !result.pmid) {
    result['Ahead of Print?'] = 'unknown';
  } else {
    result['Ahead of Print?'] = 'not applicable';
  }
  delete result.aheadofprint;
  result['Standard Compliance?'] = 'FALSE';
  result['Deluxe Compliance?'] = 'FALSE';
  var epmc_compliance_lic = result.epmc_licence ? result.epmc_licence.toLowerCase().replace(/ /g,'') : '';
  var epmc_lics = epmc_compliance_lic === 'cc-by' || epmc_compliance_lic === 'cc0' || epmc_compliance_lic === 'cc-zero' ? true : false;
  if (result.in_epmc && (result.is_aam || epmc_lics)) result['Standard Compliance?'] = 'TRUE';
  if (result.in_epmc && result.is_aam) result['Deluxe Compliance?'] = 'TRUE';
  if (result.in_epmc && epmc_lics && result.is_oa) result['Deluxe Compliance?'] = 'TRUE';
  delete result.is_aam;

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
    if (result.journal.eissn && ( !result.ISSN || result.ISSN.indexOf(result.journal.eissn) === -1 ) ) result.ISSN += ', ' + result.journal.eissn;
    if ( result.journal.in_doaj === true ) {
      result['Journal Type'] = 'oa';
    } else {
      result['Journal Type'] = 'hybrid';
    }
    delete result.journal;
  }
  if ( result.author.length > 0) {
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
      if (g.agency && g.agency.toLowerCase().indexOf('wellcome') !== -1) {
        grants.unshift(g);
      } else {
        grants.push(g);
      }
    }
    for ( var gr in grants ) {
      if (grants[gr] !== undefined) {
        result['Grant ' + (parseInt(gr)+1)] = grants[gr].grantId;
        result['Agency ' + (parseInt(gr)+1)] = grants[gr].agency;
        result['PI ' + (parseInt(gr)+1)] = grants[gr].PI ? grants[gr].PI : 'unknown';
      }
    }
    delete result.grants;
  }
  for ( var key in result ) {
    if ( result[key] === true ) result[key] = 'TRUE';
    if ( result[key] === false ) result[key] = 'FALSE';
    if ( result[key] === undefined || result[key] === null ) result[key] = 'unknown';
    if ( s[key] !== undefined ) {
      if (s[key] !== false) result[s[key]] = result[key];
      delete result[key];
    }
  }
  if (result.pmcid && result.pmcid.toLowerCase().indexOf('pmc') !== 0) result.pmcid = 'PMC' + result.pmcid; // wellcome expect it to start with PMC
  return result;
}

var _formatlantern = function(result) {
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
    romeo_colour: 'Sherpa Romeo colour',
    in_core: 'In CORE?',
    epmc_licence: false,
    epmc_licence_source: false,
    createdAt: false,
    process: false,
    result: false,
    publisher_licence_check_ran: false,
    publisher_licence: false,
    '_id': false // these listed to false just get removed from output
  }
  if (result.aheadofprint === false) {
    result['Ahead of Print?'] = 'FALSE';
  } else if (result.aheadofprint) {
    result['Ahead of Print?'] = 'TRUE';
  } else if ( !result.in_epmc && !result.pmid) {
    result['Ahead of Print?'] = 'unknown';
  } else {
    result['Ahead of Print?'] = 'not applicable';
  }
  delete result.aheadofprint;
  if ( result.provenance ) {
    result.Provenance = '';
    var fst = true;
    for ( var p in result.provenance ) {
      if (fst) {
        fst = false;
      } else {
        result.Provenance += '\r\n';
      }
      result.Provenance += result.provenance[p];
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
    if (result.journal.eissn && ( !result.ISSN || result.ISSN.indexOf(result.journal.eissn) === -1 ) ) result.ISSN += ', ' + result.journal.eissn;
    if ( result.journal.in_doaj === true ) {
      result['Journal Type'] = 'oa';
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
      if (g.agency && g.agency.toLowerCase().indexOf('wellcome') !== -1) {
        grants.unshift(g);
      } else {
        grants.push(g);
      }
    }
    for ( var gr in grants ) {
      if (grants[gr] !== undefined) {
        result['Grant ' + (parseInt(gr)+1)] = grants[gr].grantId;
        result['Agency ' + (parseInt(gr)+1)] = grants[gr].agency;
        result['PI ' + (parseInt(gr)+1)] = grants[gr].PI ? grants[gr].PI : 'unknown';
      }
    }
    delete result.grants;
  }
  if (result.embargo) {
    if (result.embargo.preprint) result['Preprint Embargo'] = result.embargo.preprint;
    if (result.embargo.postprint) result['Postprint Embargo'] = result.embargo.postprint;
    if (result.embargo.pdf) result['Publishers Copy Embargo'] = result.embargo.pdf;
    delete result.embargo;
  }
  if (result.archiving) {
    if (result.archiving.preprint) result['Preprint Self-archiving Policy'] = result.archiving.preprint;
    if (result.archiving.postprint) result['Postprint Self-archiving Policy'] = result.archiving.postprint;
    if (result.archiving.pdf) result['Publishers Copy Self-Archiving Policy'] = result.archiving.pdf;
    delete result.archiving;    
  }
  if (result.repositories) {
    result['Archived repositories'] = '';
    for ( var rr in result.repositories ) {
      if (result['Archived repositories'] !== '') result['Archived repositories'] += '\r\n';
      result['Archived repositories'] += result.repositories[rr];
    }
    delete result.repositories;    
  }
  for ( var key in result ) {
    if ( result[key] === true ) result[key] = 'TRUE';
    if ( result[key] === false ) result[key] = 'FALSE';
    if ( result[key] === undefined || result[key] === null ) result[key] = 'unknown';
    if ( s[key] !== undefined ) {
      if (s[key] !== false) result[s[key]] = result[key];
      delete result[key];
    }
  }
  if (result.pmcid && result.pmcid.toLowerCase().indexOf('pmc') !== 0) result.pmcid = 'PMC' + result.pmcid;
  return result;
}

CLapi.internals.service.lantern.format = function(result,format) {
  if (format === 'wellcome') {
    return _formatwellcome(result);
  } else {
    return _formatlantern(result);
  }
}

CLapi.internals.service.lantern.alertdone = function() {
  var j = lantern_jobs.find({done:{$not:{$eq:true}}});
  var ret = 0;
  j.forEach(function(job) {
    var progress = CLapi.internals.service.lantern.progress(job._id);
    if (progress && progress.progress === 100) {
      ret += 1;
    }
  });
  return ret;
}

CLapi.internals.service.lantern.dropoldresults = function() {
  // search for results over 180 days old and delete them
  var d = Meteor.settings.cron.lantern_dropoldresults;
  var r = lantern_results.find({done:{$not:{$eq:true}}});
  var ret = 0;
  r.forEach(function(res) {
    lantern_results.remove(res._id);
    ret += 1;
  });
  return ret;
}

CLapi.internals.service.lantern.dropoldjobs = function() {
  // search for results over d days old and delete them
  var d = Meteor.settings.cron.lantern_dropoldjobs;
  var j = lantern_jobs.find({done:{$not:{$eq:true}}});
  var ret = 0;
  j.forEach(function(job) {
    lantern_jobs.remove(job._id);
    ret += 1;
  });
  return ret;
}

if ( Meteor.settings.cron.lantern_dropoldjobs ) {
  SyncedCron.add({
    name: 'lantern_dropoldjobs',
    schedule: function(parser) { return parser.recur().every(24).hour(); },
    job: CLapi.internals.service.lantern.dropoldjobs
  });
}
if ( Meteor.settings.cron.lantern_dropoldresults ) {
  SyncedCron.add({
    name: 'lantern_dropoldresults',
    schedule: function(parser) { return parser.recur().every(24).hour(); },
    job: CLapi.internals.service.lantern.dropoldresults
  });
}
if ( Meteor.settings.cron.lantern_alertdone ) {
  SyncedCron.add({
    name: 'lantern_alertdone',
    schedule: function(parser) { return parser.recur().every(10).minute(); },
    job: CLapi.internals.service.lantern.alertdone
  });
}
if ( Meteor.settings.cron.lantern ) {
  SyncedCron.add({
    name: 'lantern',
    schedule: function(parser) { return parser.recur().every(1).second(); },
    job: CLapi.internals.service.lantern.nextProcess
  });
}
SyncedCron.start(); // where should the cron starter go in the API code? - a generic startup section somewhere?




