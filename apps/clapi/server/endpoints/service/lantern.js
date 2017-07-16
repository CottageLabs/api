
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
lantern_meta = new Mongo.Collection("lantern_meta"); // meta info to store across cron checks
lantern_jobs = new Mongo.Collection("lantern_jobs"); // batches of submitted jobs from users
lantern_processes = new Mongo.Collection("lantern_processes"); // individual processes of ident object sets {doi:"blah",pmid:"same"}
lantern_results = new Mongo.Collection("lantern_results"); // results for particular identifiers
// There can be more than one result for an identified paper, because they are re-run if outwith acceptable time limit

CLapi.addCollection(lantern_meta);
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
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0 && !idents.pmcid.match(/^(PMC)*0/i)) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0 && !idents.pmid.match(/^0/)) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});
  if (m.length === 0) {  // causes a Mongo error otherwise, since Mongo does not like $or: [] in the queries below
    return undefined;
  }
  return lantern_processes.findOne({$or: m});
}
lantern_results.findByIdentifier = function(idents,refresh) {  
  var m = [];
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0 && !idents.pmcid.match(/^(PMC)*0/i)) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0 && !idents.pmid.match(/^0/)) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});

  if (m.length === 0) {  // causes a Mongo error otherwise, since Mongo does not like $or: [] in the queries below
    return undefined;
  }

  var s = {};
  if (refresh !== undefined) {
    var d = new Date();
    var t = refresh === true ? d : d.setDate(d.getDate() - refresh);
    s.$and = [{$or:m},{createdAt:{$gte:t}}];
  } else {
    s.$or = m;
  }
  return lantern_results.findOne(s,{sort:{createdAt:-1}});
}
lantern_results.findFreshById = function(id,refresh) {  
  var d = new Date();
  var t = refresh === true ? d : d.setDate(d.getDate() - refresh);
  return lantern_results.findOne({$and:[{'_id':id},{createdAt:{$gte:t}}]},{sort:{createdAt:-1}});
}


CLapi.addRoute('service/lantern', {
  get: {
    action: function() {
      // could trigger a simple GET with query param to submit one URL
      if ( this.queryParams.apikey && ( this.queryParams.doi || this.queryParams.pmid || this.queryParams.pmc ) ) {
        var user = CLapi.internals.accounts.retrieve(this.queryParams.apikey);
        if (user) {
          var u = user._id;
          var j = lantern_jobs.insert({new:true,user:user._id});
          var b = [];
          if (this.queryParams.doi) b.push({doi:this.queryParams.doi});
          if (this.queryParams.pmid) b.push({pmid:this.queryParams.pmid});
          if (this.queryParams.pmcid) b.push({pmcid:this.queryParams.pmcid});
          var r = this.queryParams.refresh;
          var w = this.queryParams.wellcome;
          Meteor.setTimeout(function() { CLapi.internals.service.lantern.job(b,u,r,w,j); }, 5);
          return {status: 'success', data: {job:j}};
        } else {
          return {statusCode: 401, body: {status: 'error', data: 'unauthorised'}}
        }
      } else {
        return {status: 'success', data: 'The lantern API'}
      }
    }
  },
  post: {
    action: function() {
      var acc;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        acc = CLapi.internals.accounts.retrieve(apikey);
      }
      if (!acc && this.request.body.list && this.request.body.list.length > 1) return {statusCode: 401, body: {status: 'error', data: 'unauthorised'}}
      var w = this.request.body.email ? true : false;
      var j = w ? lantern_jobs.insert({new:true,wellcome:true,user:this.userId}) : lantern_jobs.insert({new:true,user:this.userId});
      var b = this.request.body;
      var u = (acc ? acc._id : undefined);
      var r = this.queryParams.refresh;
      Meteor.setTimeout(function() { CLapi.internals.service.lantern.job(b,u,r,w,j); }, 5);
      return {status: 'success', data: {job:j}};
    }
  }
});

CLapi.addRoute('service/lantern/:job', {
  get: {
    roleRequired: 'lantern.user',
    action: function() {
      var job = lantern_jobs.findOne(this.urlParams.job);
      if ( !CLapi.internals.service.lantern.allowed(job,this.user) ) return {statusCode:401, body:{}}
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
    roleRequired: 'lantern.admin',
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
  get: {
    action: function() {
      var job = lantern_jobs.findOne(this.urlParams.job);
      if (!job) return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      var acc;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        acc = CLapi.internals.accounts.retrieve(apikey);
      }
      //if ( (acc === undefined && job.list.length !== 1) || ( acc && !CLapi.internals.service.lantern.allowed(job,acc ) ) ) return {statusCode:401, body:{}}
      
      var res;
      if ( this.queryParams.format === 'csv' ) {
        var ignorefields = [];
        if (this.user.service.lantern.profile && this.user.service.lantern.profile.fields) {
          for ( var f in this.user.service.lantern.profile.fields) {
            if (this.user.service.lantern.profile.fields[f] === false && ( this.queryParams[f] === undefined || this.queryParams[f] === 'false') ) ignorefields.push(f);
          }
        }
        var csv = CLapi.internals.service.lantern.csv(this.urlParams.job,ignorefields);
        var name = 'results';
        if (job.name) name = job.name.split('.')[0].replace(/ /g,'_') + '_results';
        this.response.writeHead(200, {
          'Content-disposition': "attachment; filename="+name+".csv",
          'Content-type': 'text/csv; charset=UTF-8',
          'Content-length': csv.length
        });
        this.response.write(csv);
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
    roleRequired: 'lantern.user',
    action: function() {
      // wellcome found it useful to be able to download the original file, 
      // so this route should just find the job and return the file without any results
      var job = lantern_jobs.findOne(this.urlParams.job);
      if ( !CLapi.internals.service.lantern.allowed(job,this.user) ) return {statusCode:401, body:{}}
      var fl = [];
      for ( var j in job.list ) {
        var jb = job.list[j];
        if (jb.process) delete jb.process;
        // look for upper and lowercase dups of ID fields, and remove one. Look for title and "article title" too
        fl.push(jb);
      }
      //return fl;
      var ret = CLapi.internals.convert.json2csv(undefined,undefined,fl);
      var name = 'original';
      if (job.name) name = job.name.split('.')[0].replace(/ /g,'_');
      this.response.writeHead(200, {
        'Content-disposition': "attachment; filename="+name+"_original.csv",
        'Content-type': 'text/csv; charset=UTF-8',
        'Content-length': ret.length
      });
      this.response.write(ret);
      this.done();
      return {}
    }
  }
});

CLapi.addRoute('service/lantern/jobs', {
  get: {
    roleRequired: 'lantern.admin',
    action: function() {
      var results = [];
      var jobs = lantern_jobs.find();
      jobs.forEach(function(job) {
        job.processes = job.list ? job.list.length : 0;
        if (job.processes === 0) {
          lantern_jobs.remove(job._id);
        } else {
          delete job.list;
          results.push(job);          
        }
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
    }
  }
});

CLapi.addRoute('service/lantern/jobs/todo', {
  get: {
    roleRequired: 'lantern.admin',
    action: function() {
      var results = [];
      var jobs = lantern_jobs.find({done:{$not:{$eq:true}}});
      jobs.forEach(function(job) {
        if (job.list) { // some old or incorrectly created jobs could have no list
          job.processes = job.list.length;
          delete job.list;
        } else {
          job.processes = 0;
        }
        results.push(job);
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
    }
  },
  delete: {
    roleRequired: 'root',
    action: function() {
      var count = lantern_jobs.find({done:{$not:{$eq:true}}}).count();
      lantern_jobs.remove({done:{$not:{$eq:true}}});
      // TODO should this remove all processes associated with the jobs being deleted?
      return {status: 'success', total: count}
    }
  }
});

CLapi.addRoute('service/lantern/jobs/reload', {
  get: {
    roleRequired: 'lantern.admin',
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.reload() }
    }
  }
});

CLapi.addRoute('service/lantern/jobs/:email', {
  get: {
    roleRequired: 'lantern.user',
    action: function() {
      var results = [];
      if ( !( CLapi.internals.accounts.auth('lantern.admin',this.user) || this.user.emails[0].address === this.urlParams.email ) ) return {statusCode:401,body:{}}
      var jobs = lantern_jobs.find({email:this.urlParams.email},{sort:{createdAt:-1}});
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
      return {status: 'success', data: lantern_processes.find({processing:{$eq:true}}).count() }
    }
  }
});
CLapi.addRoute('service/lantern/processes/reset', {
  get: {
    roleRequired: 'lantern.admin',
    action: function() {
      return {status: 'success', data: CLapi.internals.service.lantern.reset() }
    }
  }
});

// a route to trigger a specific process - should probably have admin auth or be removed
CLapi.addRoute('service/lantern/process/:proc', {
  get: {
    roleRequired: 'lantern.admin',
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

CLapi.addRoute('service/lantern/fields/:email', {
  post: {
    roleRequired: 'lantern.user',
    action: function() {
      if ( CLapi.internals.accounts.auth('lantern.admin',this.user) || this.user.emails[0].address === this.urlParams.email ) {
        if (this.user.service.lantern.profile === undefined) {
          this.user.service.lantern.profile = {fields:{}};
          Meteor.users.update(this.userId, {$set: {'service.lantern.profile':{fields:{}}}});
        } else if (this.user.service.lantern.profile.fields === undefined) {
          this.user.service.lantern.profile.fields = {};
          Meteor.users.update(this.userId, {$set: {'service.lantern.profile.fields':{}}});
        }
        for ( var p in this.request.body ) this.user.service.lantern.profile.fields[p] = this.request.body[p];
        Meteor.users.update(this.userId, {$set: {'service.lantern.profile.fields':this.user.service.lantern.profile.fields}});
        return {status: 'success', data: this.user.service.lantern.profile.fields }
      } else {
        return {statusCode:401, body:{}}
      }
    }
  }
});


CLapi.internals.service.lantern = {};

CLapi.internals.service.lantern.allowed = function(job,uacc) {
  return job.user === uacc._id || CLapi.internals.accounts.auth('lantern.admin',uacc) || job.wellcome === true;
}

CLapi.internals.service.lantern.status = function() {
  return {
    processes: {
      total: lantern_processes.find().count(),
      running: lantern_processes.find({processing:{$eq:true}}).count()
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
  var procs = lantern_processes.find({processing:{$eq:true}});
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
CLapi.internals.service.lantern.job = function(input,uid,refresh,wellcome,jid) {
  var user = uid ? CLapi.internals.accounts.retrieve(uid) : undefined;
  var job = {user:uid};
  if (wellcome) {
    if (refresh === undefined) refresh = 1;
    job.wellcome = true;
    job.email = input.email;
  } else {
    job.email = (user ? user.emails[0].address : undefined);
  }
  if (refresh === undefined) refresh = true; // a refresh of true forces always new results (0 would get anything older than today, etc into past)
  if (refresh !== undefined) job.refresh = parseInt(refresh);
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
    if ( j.DOI ) list[i].doi = j.DOI;
    if ( j.PMID ) list[i].pmid = j.PMID;
    if ( j.PMCID ) list[i].pmcid = j.PMCID;
    if ( j.TITLE ) list[i].title = j.TITLE;
    if ( j['Article title'] ) list[i].title = j['Article title'];
    if (j.title) j.title = j.title.replace(/\s\s+/g,' ').trim();
    if (j.pmcid) j.pmcid = j.pmcid.replace(/[^0-9]/g,'');
    if (j.pmid) j.pmid = j.pmid.replace(/[^0-9]/g,'');
    if (j.doi) j.doi = j.doi.replace(/ /g,''); // also translate from url encoding? Saw one from wellcome with a %2F in it...
    var proc = {doi:j.doi,pmcid:j.pmcid,pmid:j.pmid,title:j.title,refresh:refresh,wellcome:job.wellcome};
    var result = lantern_results.findByIdentifier(proc,refresh);
    if (result) {
      job.list[i].process = result._id;
    } else {
      var process = lantern_processes.findByIdentifier(proc);
      process ? job.list[i].process = process._id : job.list[i].process = lantern_processes.insert(proc);
    }
  }
  if (job.list.length === 0) job.done = true; // bit pointless submitting empty jobs, but theoretically possible. Could make impossible...
  job.new = false;
  if (jid !== undefined) {
    lantern_jobs.update(jid,{$set:job});
  } else {
    jid = lantern_jobs.insert(job);
  }
  if (job.email) {
    var jor = job.name ? job.name : jid;
    var text = 'Dear ' + job.email + '\n\nWe\'ve just started processing a batch of identifiers for you, ';
    text += 'and you can see the progress of the job here:\n\n';
    // TODO this bit should depend on user group permissions somehow
    // for now we assume if a signed in user then lantern, else wellcome
    if ( job.wellcome ) {
      text += 'https://compliance.cottagelabs.com#';
    } else if ( Meteor.settings.dev ) {
      text += 'http://lantern.test.cottagelabs.com#';
    } else {
      text += 'https://lantern.cottagelabs.com#';
    }
    text += jid;
    text += '\n\nIf you didn\'t submit this request yourself, it probably means that another service is running ';
    text += 'it on your behalf, so this is just to keep you informed about what\'s happening with your account; ';
    text += 'you don\'t need to do anything else.\n\n';
    text += 'You\'ll get another email when your job has completed.\n\n';
    text += 'The Lantern Team\n\nP.S This is an automated email, please do not reply to it.';
    CLapi.internals.sendmail({
      from: 'Lantern <lantern@cottagelabs.com>',
      to:job.email,
      subject:'Lantern: job ' + jor + ' submitted successfully',
      text:text
    });
  }
  return jid;
}

CLapi.internals.service.lantern.process = function(processid) {
  // process a job from the lantern_processes job list
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
    journal_title: undefined,
    pure_oa: false, // will be set to true if found in doaj
    issn: undefined,
    eissn: undefined,
    publication_date: "Unavailable",
    electronic_publication_date: undefined,
    publisher: undefined,
    publisher_licence: undefined,
    licence: 'unknown', // what sort of licence this has - should be a string like "cc-by"
    epmc_licence: 'unknown', // the licence in EPMC, should be a string like "cc-by"
    licence_source: 'unknown', // where the licence info came from
    epmc_licence_source: 'unknown', // where the EPMC licence info came from (fulltext xml, EPMC splash page, etc.)
    in_epmc: false, // set to true if found
    epmc_xml: false, // set to true if oa and in epmc and can retrieve fulltext xml from eupmc rest API url
    aam: false, // set to true if is an eupmc author manuscript
    open_access: false, // set to true if eupmc or other source says is oa
    ahead_of_print: undefined, // if pubmed returns a date for this, it will be a date
    romeo_colour: 'unknown', // the sherpa romeo colour
    preprint_embargo: 'unknown',
    preprint_self_archiving: 'unknown',
    postprint_embargo: 'unknown',
    postprint_self_archiving: 'unknown',
    publisher_copy_embargo: 'unknown',
    publisher_copy_self_archiving: 'unknown',
    authors: [], // eupmc author list if available (could look on other sources too?)
    in_core: 'unknown',
    repositories: [], // where CORE says it is. Should be list of objects
    grants:[], // a list of grants, probably from eupmc for now
    confidence: 0, // 1 if matched on ID, 0.9 if title to 1 result, 0.7 if title to multiple results, 0 if unknown article
    compliance: {},
    score: 0,
    provenance: [] // list of things that were done
  };
  
  // search eupmc by (in order) pmcid, pmid, doi, title
  // check epmc for the record https://github.com/CottageLabs/lantern-api/blob/develop/service/workflow.py#L294
  var _formatepmcdate = function(date) {
    // try to format an epmc date which could really be any string. Some we will get wrong.
    try {
      date = date.replace(/\//g,'-');
      if (date.indexOf('-') !== -1) {
        if (date.length < 11) {
          var dp = date.split('-');
          if (dp.length === 3) {
            if (date.indexOf('-') < 4) {
              // assume date is like 01-10-2006
              return dp[2] + '-' + dp[1] + '-' + dp[0] + 'T00:00:00Z';
            } else {
              // assume date is like 2006-10-01
              return date + 'T00:00:00Z';            
            }
          } else if ( dp.length === 2 ) {
            // could be date like 2006-01 or 01-2006
            if (date.indexOf('-') < 4) {
              return dp[1] + dp[0] + date + '-01T00:00:00Z';
            } else {
              return date + '-01T00:00:00Z';
            }
          } else {
            return date;
          }
        } else {
          // what else could be tried?
          return date;
        }
      } else {
        var dateparts = date.replace(/  /g,' ').split(' ');
        var yr = dateparts[0].toString();
        var mth = dateparts.length > 1 ? dateparts[1] : 1;
        if ( isNaN(parseInt(mth)) ) {
          var mths = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          var tmth = mth.toLowerCase().substring(0,3);
          if (mths.indexOf(tmth) !== -1) {
            mth = mths.indexOf(tmth) + 1;
          } else {
            mth = "01";
          }
        } else {
          mth = parseInt(mth);
        }
        mth = mth.toString();
        if (mth.length === 1) mth = "0" + mth;
        var dy = dateparts.length > 2 ? dateparts[2].toString() : "01";
        if (dy.length === 1) dy = "0" + dy;
        date = yr + '-' + mth + '-' + dy + 'T00:00:00Z';
        return date;
      }
    } catch(err) {
      return date;
    }
  }
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
          prst = 'TITLE:"' + prst.replace('"','') + '"';
        }
        if (stt === 'pmcid') stt = 'pmc';
        var res = CLapi.internals.use.europepmc[stt](prst);
        if (res.data) {
          if (res.data.id && stt !== 'search') {
            eupmc = res.data;
            result.confidence = 1;
          } else if (stt === 'search') {
            if (res.total && res.total === 1) {
              eupmc = res.data[0];
              result.confidence = 0.9; // exact title match
            } else {
              // try a fuzzy match
              prst = prst.replace('"','');
              var res2 = CLapi.internals.use.europepmc[stt](prst);
              if (res2.total && res2.total === 1) {
                eupmc = res2.data[0];
                result.confidence = 0.7;                
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
      result.open_access = true;
      result.provenance.push('Confirmed is open access from EUPMC');
    }
    if (eupmc.journalInfo && eupmc.journalInfo.journal ) {
      if ( eupmc.journalInfo.journal.title ) {
        result.journal_title = eupmc.journalInfo.journal.title; // completes oacwellcome issue 93
        result.provenance.push('Added journal title from EUPMC');
      }
      if ( eupmc.journalInfo.journal.issn ) {
        result.issn = eupmc.journalInfo.journal.issn;
        result.provenance.push('Added issn from EUPMC');
      }
      if ( eupmc.journalInfo.journal.essn) {
        result.eissn = eupmc.journalInfo.journal.essn;
        if (result.eissn && ( !result.issn || result.issn.indexOf(result.eissn) === -1 ) ) result.issn = (result.issn ? result.issn + ', ' : '') + result.eissn;
        result.provenance.push('Added eissn from EUPMC');
      }
    }
    if (eupmc.grantsList && eupmc.grantsList.grant) {
      result.grants = eupmc.grantsList.grant;
      result.provenance.push('Added grants data from EUPMC');
    }
    // some dates that wellcome want - dateofpublication appears to be what they prefer
    //if (eupmc.journalInfo && eupmc.journalInfo.printPublicationDate) result.print_publication_date = eupmc.journal.printPublicationDate;
    if (eupmc.journalInfo && eupmc.journalInfo.dateOfPublication) {
      result.publication_date = _formatepmcdate(eupmc.journalInfo.dateOfPublication);
      result.provenance.push('Added date of publication from EUPMC');
    }
    if (eupmc.electronicPublicationDate) {
      result.electronic_publication_date = _formatepmcdate(eupmc.electronicPublicationDate);
      result.provenance.push('Added electronic publication date from EUPMC');
    }

    var ft_envelope;
    if (result.open_access && result.in_epmc) ft_envelope = CLapi.internals.use.europepmc.fulltextXML(undefined, eupmc);
    if (ft_envelope && !ft_envelope.fulltext && result.pmcid) ft_envelope = CLapi.internals.use.europepmc.fulltextXML(result.pmcid);

    if (ft_envelope && ft_envelope.error) {
      if (ft_envelope.error == 404) {
        result.provenance.push('Not found in EUPMC when trying to fetch full text XML.');
      } else {
        result.provenance.push('Encountered an error while retrieving the EUPMC full text XML. One possible reason is EUPMC being temporarily unavailable.');
      }
    }
    
    var ft = ft_envelope ? ft_envelope.fulltext : false;
    if (ft) {
      result.epmc_xml = true;
      result.provenance.push('Confirmed fulltext XML is available from EUPMC');
    }
    var lic = CLapi.internals.use.europepmc.licence(result.pmcid,eupmc,ft,(!proc.wellcome && Meteor.settings.lantern.epmc_ui_only_wellcome));
    if (lic !== false) {
      result.licence = lic.licence;
      result.epmc_licence = lic.licence;
      result.licence_source = lic.source;
      result.epmc_licence_source = lic.source;
      var extrainfo = '';
      // add the exact licence type here since for wellcome this is now lost under non-standard-licence translation
      if (lic.matched) {extrainfo += ' The bit that let us determine the licence was: ' + lic.matched + ' .';}
      if (lic.matcher) {extrainfo += ' If licence statements contain URLs we will try to find those in addition to ' +
        'searching for the statement\'s text. Here the entire licence statement was: ' + lic.matcher + ' .';}
      result.provenance.push('Added EPMC licence (' + result.epmc_licence + ') from ' + lic.source + '.' + extrainfo);

      // result.licence and result.licence_source can be overwritten later by
      // the academic licence detection (what OAG used to do), but we will keep the
      // EPMC information separately.
    }
    if (eupmc.authorList && eupmc.authorList.author) {
      result.authors = eupmc.authorList.author;
      result.provenance.push('Added author list from EUPMC');
    }
    if (result.in_epmc) {
      var aam = CLapi.internals.use.europepmc.authorManuscript(result.pmcid,eupmc,undefined,(!proc.wellcome && Meteor.settings.lantern.epmc_ui_only_wellcome));
      if (aam === false) {
        result.aam = false;
        result.provenance.push('Checked author manuscript status in EUPMC, found no evidence of being one');
      } else if (aam.startsWith('Y')) {
        result.aam = true;
        result.provenance.push('Checked author manuscript status in EUPMC, returned ' + aam);
      } else if (aam === 'unknown-not-found-in-epmc') {
        result.aam = 'unknown';
        result.provenance.push('Unable to locate Author Manuscript information in EUPMC - could not find the article in EUPMC.');
      } else if (aam === 'unknown-error-accessing-epmc') {
        result.aam = 'unknown';
        result.provenance.push('Error accessing EUPMC while trying to locate Author Manuscript information. EUPMC could be temporarily unavailable.');
      } else {
        result.aam = 'unknown';
      }
    }
  } else {
    result.provenance.push('Unable to locate article in EPMC.')
  }

  if (!result.doi && !result.pmid && !result.pmcid) {
    result.provenance.push('Unable to obtain DOI, PMID or PMCID for this article. Compliance information may be severely limited.');
  }

  if (result.doi) {
    var crossref = CLapi.internals.use.crossref.works.doi(result.doi);
    if (crossref.status === 'success') {
      var c = crossref.data;
      if (!result.confidence) {
        // Do not overwrite previously set confidence, if any.
        // The only other place which sets confidence is the EUPMC lookup. If it already set it to 1, then we don't
        // need to do anything. But if a title-only search (i.e. less confident lookup) set it to < 1, then we will
        // wrongly overwrite it here.
        result.confidence = 1;
      }
      result.publisher = c.publisher; // completes oacwellcome issue 90
      result.provenance.push('Added publisher name from Crossref');
      if (!result.issn && c.ISSN && c.ISSN.length > 0) {
        result.issn = c.ISSN[0];
        result.provenance.push('Added ISSN from Crossref');
      }
      if (!result.journal_title && c['container-title'] && c['container-title'].length > 0) {
        result.journal_title = c['container-title'][0];
        result.provenance.push('Added journal title from Crossref');
      }
      if (!result.authors && c.author) {
        result.authors = c.author; // format like eupmc author list?
        result.provenance.push('Added author list from Crossref');
      }
      if (!result.title && c.title && c.title.length > 0) {
        result.title = c.title[0]; 
        result.provenance.push('Added article title from Crossref');
      }
    } else {
      result.provenance.push('Unable to obtain information about this article from Crossref.')
    }
    
    // look up core to see if it is in there (in fulltext or not?)
    // should we use BASE / dissemin as well / instead?)
    if (result.doi) {
      var core = CLapi.internals.use.core.articles.doi(result.doi);
      if (core.data && core.data.id) {
        result.in_core = true;
        result.provenance.push('Found DOI in CORE');
        var cc = core.data;
        if (!result.authors && cc.authors) {
          result.authors = cc.author; // format like eupmc author list?      
          result.provenance.push('Added authors from CORE');
        }
        if (cc.repositories && cc.repositories.length > 0) {
          for ( var ci in cc.repositories ) {
            var rep = cc.repositories[ci];
            if (rep.uri && rep.uri.length > 0) {
              rep.url = rep.uri;
              delete rep.uri;
            } else {
              try {
                var repo = CLapi.internals.use.opendoar.search(rep.name);
                if (repo.status === 'success' && repo.total === 1 && repo.data[0].url) {
                  rep.url = repo.data[0].url;
                  // or is ourl or uurl more appropriate? See https://dev.api.cottagelabs.com/use/opendoar/search/Aberdeen%2520University%2520Research%2520Archive
                  result.provenance.push('Added repo base URL from OpenDOAR');                  
                } else {
                  result.provenance.push('Searched OpenDOAR but could not find repo and/or URL');                  
                }
              } catch (err) {
                result.provenance.push('Tried but failed to search OpenDOAR for repo base URL');          
              }
            }
            if (rep.id) delete rep.id;
            rep.fulltexts = [];
            if ( cc.fulltextUrls ) {
              for ( var f in cc.fulltextUrls ) {
                var fu = cc.fulltextUrls[f];
                console.log(fu);
                if ( fu.indexOf('core.ac.uk') === -1 ) {
                  try {
                    //var exists = Meteor.http.call('GET',fu); // will throw an error if cannot be accessed
                    var resolved;
                    try {
                      resolved = fu;
                      //resolved = fu.indexOf('dx.doi.org') !== -1 ? CLapi.internals.academic.doiresolve(fu) : CLapi.internals.academic.redirect_chain_resolve(fu);
                    } catch (err) {
                      resolved = fu;
                    }
                    if (rep.fulltexts.indexOf(resolved) === -1 && (!rep.url || ( rep.url && resolved.indexOf(rep.url.replace('http://','').replace('https://','').split('/')[0]) !== -1 ) ) ) rep.fulltexts.push(resolved);
                  } catch (err) {}
                }
              }
            }
            result.repositories.push(rep); // add URL here - does not seem to be in CORE data
          }
          result.provenance.push('Added repositories that CORE claims article is available from');
        }
        if (!result.title && cc.title) {
          result.title = cc.title;
          result.provenance.push('Added title from CORE');
        }
        // anything useful from fulltextUrls key?
        // can open_access be inferred from being in CORE? probably not reliably... 
        // maybe if has any fulltextUrls it is, but some don't have such URLs even if they clearly should exist
      } else {
        result.in_core = false;
        result.provenance.push('Could not find DOI in CORE');
      }
    }
  } else {
    result.provenance.push('Not attempting Crossref or CORE lookups - do not have DOI for article.');
  }
  console.log('Finished lantern processing of CORE data')

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
  } else {
    result.provenance.push('Not attempting Grist API grant lookups since no grants data was obtained from EUPMC.');
  }
  
  if (result.pmid && !result.in_epmc) {
    result.ahead_of_print = CLapi.internals.use.pubmed.aheadofprint(result.pmid);
    if (result.ahead_of_print !== false) {
      result.provenance.push('Checked ahead of print status on pubmed, date found ' + result.ahead_of_print);      
    } else {
      result.provenance.push('Checked ahead of print status on pubmed, no date found');
    }
  } else {
    var msg = 'Not checking ahead of print status on pubmed.';
    if (!result.pmid) {msg += ' We don\'t have the article\'s PMID.';}
    if (result.in_epmc) {msg += ' The article is already in EUPMC.';}
    result.provenance.push(msg);
  }
  
  if ( result.issn ) {
    // is it in doaj
    var doaj = CLapi.internals.use.doaj.journals.issn(result.issn);
    if (doaj.status === 'success') {
      result.pure_oa = true;
      result.provenance.push('Confirmed journal is listed in DOAJ');
      if (!result.publisher && doaj.data.bibjson.publisher) result.publisher = doaj.data.bibjson.publisher;
      if (!result.journal_title && doaj.data.bibjson.title) result.journal_title = doaj.data.bibjson.title;
    } else {
      result.provenance.push('Could not find journal in DOAJ');      
    }
    
    // what are the policies from sherpa romeo
    var romeo = CLapi.internals.use.sherpa.romeo.search({issn:result.issn});
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
      if (!result.journal_title) {
        if (journal && journal.jtitle && journal.jtitle.length > 0) {
          result.journal_title = journal.jtitle[0];
          result.provenance.push('Added journal title from Sherpa Romeo');
        } else {
          result.provenance.push('Tried, but could not add journal title from Sherpa Romeo.');
        }
      }
      if (!result.publisher) {
        if (publisher && publisher.name && publisher.name.length > 0) {
          result.publisher = publisher.name[0];
          result.provenance.push('Added publisher from Sherpa Romeo');
        } else {
          result.provenance.push('Tried, but could not add publisher from Sherpa Romeo.');
        }
      }
      if (publisher) result.romeo_colour = publisher.romeocolour[0];
      var keys = ['preprint','postprint','publisher_copy'];
      for ( var k in keys ) {
        var main = keys[k].indexOf('publisher_copy') !== -1 ? keys[k] + 's' : 'pdfversion';
        var stub = keys[k].replace('print','').replace('publisher_copy','pdf');
        if ( publisher && publisher[main]) {
          if (publisher[main][0][stub+'restrictions']) {
            for ( var p in publisher[main][0][stub+'restrictions'] ) {
              if (publisher[main][0][stub+'restrictions'][p][stub+'restriction']) {
                result[k+'_embargo'] === false ? result[k+'_embargo'] = '' : result[k+'_embargo'] += ',';
                result[k+'_embargo'] += publisher[main][0][stub+'restrictions'][p][stub+'restriction'][0].replace(/<.*?>/g,'');
              }
            }
          }
          if (publisher[main][0][stub+'archiving']) result[k+'_self_archiving'] = publisher[k+'s'][0][stub+'archiving'][0];
        }
      }
      result.provenance.push('Added embargo and archiving data from Sherpa Romeo');
      // can we infer licence or open_access from sherpa data?
    } else {
      result.provenance.push('Unable to add any data from Sherpa Romeo.')
    }
  } else {
    result.provenance.push('Not attempting to add any data from Sherpa Romeo - don\'t have a journal ISSN to use for lookup.')
  }
  
  // if license could not be found yet, call academic/licence to get info from the splash page
  var publisher_licence_check_ran = false;
  if (!result.licence || result.licence === 'unknown' || (result.licence != 'cc-by' && result.licence != 'cc-zero')) {
    publisher_licence_check_ran = true;
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
        result.provenance.push('Added licence (' + result.publisher_licence + ') via article publisher splash page lookup to ' + lic.resolved + ' (used to be OAG).' + extrainfo);
      } else {
        result.publisher_licence = 'unknown';
        result.provenance.push('Unable to retrieve licence data via article publisher splash page lookup (used to be OAG).');
        if (lic.large) result.provenance.push('Retrieved content was very long, so was contracted to 500,000 chars from start and end to process');
      }
    } else {
      result.provenance.push('Unable to retrieve licence data via article publisher splash page (used to be OAG) - cannot obtain a suitable URL to run the licence detection on.');
    }
  } else {
    result.provenance.push('Not attempting to retrieve licence data via article publisher splash page lookup (used to be OAG).');
    publisher_licence_check_ran = false;
  }
  
  if (!publisher_licence_check_ran && result.publisher_licence !== 'unknown') result.publisher_licence = "not applicable";
  if (result.publisher_licence === undefined) result.publisher_licence = 'unknown';
  // if the licence starts with cc-, leave it. Otherwise set to non-standard-licence. TODO should this apply even to non-wellcome ones?
  if (result.epmc_licence !== undefined && result.epmc_licence !== 'unknown' && !result.epmc_licence.startsWith('cc-')) {
    result.epmc_licence = 'non-standard-licence';
  }
  if (result.publisher_licence !== undefined && result.publisher_licence !== 'unknown' && result.publisher_licence !== "not applicable" && !result.publisher_licence.startsWith('cc-')) {
    result.publisher_licence = 'non-standard-licence';
  }
  
  result = CLapi.internals.service.lantern.compliance(result); // get the compliance figures
  result.score = CLapi.internals.service.lantern.score(result);
  
  lantern_results.insert(result);
  lantern_processes.remove(proc._id);
  
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
    } else if (job.new === true) {
      p = 0;
    } else {
      var total = job.list.length;
      var count = 0;
      for ( var i in job.list ) {
        var found = lantern_results.findOne(job.list[i].process);
        // could add a check for OTHER results with similar IDs - but shouldn't be any, and would have to re-sanitise the IDs
        if ( found ) {
          count += 1;
        }
      }
      p = count/total * 100;      
      if ( p === 100 ) {
        lantern_jobs.update(job._id, {$set:{done:true}});
        if (job.email) {
          var jor = job.name ? job.name : job._id;
          var text = 'Dear ' + job.email + '\n\nWe\'ve just finished processing a batch ';
          text += 'of identifiers for you, and you can download the final results here:\n\n';
          // TODO this bit should depend on user group permissions somehow
          // for now we assume if a signed in user then lantern, else wellcome
          if ( job.wellcome ) {
            text += 'https://compliance.cottagelabs.com#';
          } else if ( Meteor.settings.dev ) {
            text += 'http://lantern.test.cottagelabs.com#';
          } else {
            text += 'https://lantern.cottagelabs.com#';
          }
          text += job._id;
          text += '\n\nIf you didn\'t submit the original request yourself, it probably means ';
          text += 'that another service was running it on your behalf, so this is just to keep you ';
          text += 'informed about what\'s happening with your account; you don\'t need to do anything else.';
          text += '\n\nThe Lantern Team\n\nP.S This is an automated email, please do not reply to it.';
          CLapi.internals.sendmail({
            from: 'Lantern <lantern@cottagelabs.com>',
            to:job.email,
            subject:'Lantern: job ' + jor + ' completed successfully',
            text:text
          });
        }    
      }
    }
    return {progress:p,name:job.name,email:job.email,_id:job._id,new:job.new,createdAt:job.createdAt};
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

CLapi.internals.service.lantern.compliance = function(result) {
  // add the wellcome compliance standards
  result.compliance_wellcome_standard = false;
  result.compliance_wellcome_deluxe = false;
  var epmc_compliance_lic = result.epmc_licence ? result.epmc_licence.toLowerCase().replace(/ /g,'') : '';
  var epmc_lics = epmc_compliance_lic === 'cc-by' || epmc_compliance_lic === 'cc0' || epmc_compliance_lic === 'cc-zero' ? true : false;
  if (result.in_epmc && (result.aam || epmc_lics)) result.compliance_wellcome_standard = true;
  if (result.in_epmc && result.aam) result.compliance_wellcome_deluxe = true;
  if (result.in_epmc && epmc_lics && result.open_access) result.compliance_wellcome_deluxe = true;
  
  // add any new compliance standards calculations here - can call them out to separat function if desired, though they have no other use yet
  return result;
}

CLapi.internals.service.lantern.score = function(result) {
  // TODO calculate a lantern "open" score for this article
  return 0;
}

CLapi.internals.service.lantern.results = function(jobid) {
  // for a job, get all the results for it and return them as an object
  var job = lantern_jobs.findOne(jobid);
  if (job) {
    var results = [];
    for ( var i in job.list ) {
      var ji = job.list[i];
      var found = lantern_results.findOne(ji.process);
      if ( found ) {
        for ( var lf in ji) {
          if (!found[lf]) found[lf] = ji[lf];
        }
        results.push(found);
      }
    }
    return results;
  } else {
    return false;
  }
}

CLapi.internals.service.lantern.csv = function(jobid,ignorefields) {
  var job = lantern_jobs.findOne(jobid);
  if (ignorefields === undefined) ignorefields = [];
  var fieldnames = {};
  try {
    fieldnames = typeof Meteor.settings.lantern.fieldnames === 'object' ? Meteor.settings.lantern.fieldnames : JSON.parse(Meteor.http.call('GET',Meteor.settings.lantern.fields).content);
  } catch(err) {}
  var fields = Meteor.settings.lantern.fields; // output order of our fields, excluding compliance, grants, provenance which will be appended to end
  var grantcount = 0;
  var fieldconfig = [];
  var results = [];
  for ( var i in job.list ) {
    var ji = job.list[i];
    var res = lantern_results.findOne(ji.process);
    if ( res ) {
      var result = {};
      if (ignorefields.indexOf('originals') === -1) {
        for ( var lf in ji) {
          if (ignorefields.indexOf(lf) === -1 && lf !== 'process' && lf !== 'createdAt' && lf !== '_id') {
            result[lf] = ji[lf]; // put any original fields into the result
            if (i === '0' && fieldconfig.indexOf(lf) === -1) fieldconfig.push(lf);
          }
        }
      }
      for ( var fn in fields ) {
        if (ignorefields.indexOf(fields[fn]) === -1) {
          var fname = fields[fn];
          var printname = fieldnames[fname] !== undefined && fieldnames[fname].short_name ? fieldnames[fname].short_name : fname;
          if (i === '0') fieldconfig.push(printname);
          if (fname === 'authors') {
            result[printname] = '';
            for ( var r in res.authors ) {
              result[printname] += r === '0' ? '' : ', ';
              if ( res.authors[r].fullName ) result[printname] += res.authors[r].fullName;
            }
          } else if (['repositories','repository_urls','repository_fulltext_urls','repository_oai_ids'].indexOf(fname) !== -1) {
            result[printname] = '';
            for ( var rr in res.repositories ) {
              if (res.repositories[rr].name) {
                if (result[printname] !== '') result[printname] += '\r\n';
                if (fname === 'repositories') {
                  result[printname] += res.repositories[rr].name;
                } else if (fname === 'repository_urls') {
                  result[printname] += res.repositories[rr].url;
                } else if (fname === 'repository_fulltext_urls') {
                  result[printname] += res.repositories[rr].fulltexts.join();
                } else if (fname === 'repository_oai_ids') {
                  result[printname] += res.repositories[rr].oai;
                }
              }
            }
          } else if (fname === 'pmcid') { 
            if (res.pmcid.toLowerCase().indexOf('pmc') !== 0) res.pmcid = 'PMC' + res.pmcid;
            result[printname] = res.pmcid;
          } else if (res[fname] === true ) {
            result[printname] = 'TRUE';
          } else if ( res[fname] === false ) {
            result[printname] = 'FALSE';
          } else if ( res[fname] === undefined || res[fname] === null || res[fname] === 'unknown' ) {
            result[printname] = 'Unknown';
          } else {
            result[printname] = res[fname];
          }
        }
      }
      if (ignorefields.indexOf('grant') === -1 || ignorefields.indexOf('agency') === -1 || ignorefields.indexOf('pi') === -1) {
        var grants = [];
        for ( var gn in result.grants) {
          var g = result.grants[gn];
          g.agency && g.agency.toLowerCase().indexOf('wellcome') !== -1 ? grants.unshift(g) : grants.push(g);
        }
        for ( var g in grants ) {
          grantcount += 1;
          if (ignorefields.indexOf('grant') === -1) result[(fieldnames['grant'] !== undefined && fieldnames['grant'].short_name ? fieldnames['grant'].short_name : 'grant').split(' ')[0] + ' ' + grantcount] = grants[g].grantId;
          if (ignorefields.indexOf('agency') === -1) result[(fieldnames['agency'] !== undefined && fieldnames['agency'].short_name ? fieldnames['agency'].short_name : 'agency').split(' ')[0] + ' ' + grantcount] = grants[g].agency;
          if (ignorefields.indexOf('pi') === -1) result[(fieldnames['pi'] !== undefined && fieldnames['pi'].short_name ? fieldnames['pi'].short_name : 'pi').split(' ')[0] + ' ' + grantcount] = (grants[g].PI ? grants[g].PI : 'unknown');
        }
      }
      if (ignorefields.indexOf('provenance') === -1) {
        var tpn = fieldnames['provenance'] !== undefined && fieldnames['provenance'].short_name ? fieldnames['provenance'].short_name : 'provenance';
        result[tpn] = '';
        for ( var pr in res.provenance ) {
          result[tpn] += pr === '0' ? '' : '\r\n';
          result[tpn] += res.provenance[pr];
        } 
      }
      results.push(result);
    }
  }
  for ( var gc = 1; gc < (grantcount+1); gc++ ) {
    if (ignorefields.indexOf('grant') === -1) fieldconfig.push((fieldnames['grant'] !== undefined && fieldnames['grant'].short_name ? fieldnames['grant'].short_name : 'grant').split(' ')[0] + ' ' + gc);
    if (ignorefields.indexOf('agency') === -1) fieldconfig.push((fieldnames['agency'] !== undefined && fieldnames['agency'].short_name ? fieldnames['agency'].short_name : 'agency').split(' ')[0] + ' ' + gc);
    if (ignorefields.indexOf('pi') === -1) fieldconfig.push((fieldnames['pi'] !== undefined && fieldnames['pi'].short_name ? fieldnames['pi'].short_name : 'pi').split(' ')[0] + ' ' + gc);
  }
  if (ignorefields.indexOf('provenance') === -1) fieldconfig.push(fieldnames['provenance'] !== undefined && fieldnames['provenance'].short_name ? fieldnames['provenance'].short_name : 'provenance');
  return CLapi.internals.convert.json2csv({fields:fieldconfig,defaultValue:'unknown'},undefined,results);
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

CLapi.internals.service.lantern.alertstuck = function() {
  var prev = lantern_meta.findOne('previous_processing_check');
  if (prev === undefined) {
    prev = {_id:'previous_processing_check',list:[],same:false,since:0,howmany:0,change:0};
    lantern_meta.insert(prev);
  }
  if (prev.howmany === undefined) prev.howmany = 0;
  var howmany = lantern_processes.find().count();
  prev.change = howmany - prev.howmany;
  prev.howmany = howmany;
  var procs = lantern_processes.find({processing:{$eq:true}}).fetch();
  var currents = [];
  var same = true;
  for ( var p in procs ) {
    currents.push(procs[p]._id);
    if ( prev.list.indexOf(procs[p]._id) === -1 ) same = false;
  }
  prev.since = same ? prev.since + 15 : 0;
  prev.same = same;
  prev.list = currents;
  lantern_meta.update('previous_processing_check',{$set:prev});
  console.log("Stuck lantern processes check")
  console.log(prev);
  var txt = ''
  if (same && currents.length !== 0 && prev.since >= 30) {
    txt = 'There appear to be ' + currents.length + ' processes stuck on the queue for at least ' + prev.since + ' minutes';
    txt += '\n\nResetting the processes may help, if you are sure you do not want to check the situation first:\n\n';
    txt += 'https://';
    if ( Meteor.settings.dev ) txt += 'dev.';
    txt += 'api.cottagelabs.com/service/lantern/processes/reset';
    CLapi.internals.sendmail({
      to:'sysadmin@cottagelabs.com',
      subject:'CL ALERT: Lantern processes stuck',
      text:txt
    });
    return true;
  } else if ( howmany !== 0 && procs.length === 0 && prev.change >= 0 ) {
    txt = 'There appear to be ' + howmany + ' processes in the system but there appear to be no processes running.';
    txt += '\n\nThe amount of processes has changed by ' + prev.change + ' since last check';
    txt += '\n\nResetting the processes is unlikely to help, but you can try, if you do not want to check the situation first:\n\n';
    txt += 'https://api.cottagelabs.com/service/lantern/processes/reset';
    CLapi.internals.sendmail({
      to:'sysadmin@cottagelabs.com',
      subject:'CL ALERT: Lantern processes may not be running',
      text:txt
    });
    return true;
  } else {
    return false;
  }
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
if ( Meteor.settings.cron.lantern_alertstuck ) {
  SyncedCron.add({
    name: 'lantern_alertstuck',
    schedule: function(parser) { return parser.recur().every(15).minute(); },
    job: CLapi.internals.service.lantern.alertstuck
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
SyncedCron.config({utc:true}); // defaults to not utc, which caused cpu spike on 30/10/2016 0200 when clocks went back
SyncedCron.start(); // where should the cron starter go in the API code? - a generic startup section somewhere?




