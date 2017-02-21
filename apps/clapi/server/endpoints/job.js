
// TODO should become a standalone job runner, like what is in lantern

job_meta = new Mongo.Collection("jobby_meta");
job_job = new Mongo.Collection("jobby_job");
job_process = new Mongo.Collection("jobby_process");
job_result = new Mongo.Collection("jobby_result");

job_job.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
job_process.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
job_result.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});

CLapi.addCollection(job_meta);
CLapi.addCollection(job_job);
CLapi.addCollection(job_process);
CLapi.addCollection(job_result);

// these two should be merged into one generic search that can find by multiple values
job_process.findByIdentifier = function(idents) {
  var m = [];
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0 && !idents.pmcid.match(/^(PMC)*0/i)) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0 && !idents.pmid.match(/^0/)) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});
  if (m.length === 0) return undefined;
  return job_process.findOne({$or: m});
}
job_result.findByIdentifier = function(idents,refresh) {  
  var m = [];
  if (idents.pmcid !== undefined && idents.pmcid !== null && idents.pmcid.length > 0 && !idents.pmcid.match(/^(PMC)*0/i)) m.push({pmcid:idents.pmcid});
  if (idents.pmid !== undefined && idents.pmid !== null && idents.pmid.length > 0 && !idents.pmid.match(/^0/)) m.push({pmid:idents.pmid});
  if (idents.doi !== undefined && idents.doi !== null && idents.doi.indexOf('10.') === 0 && idents.doi.length > 6 && idents.doi.indexOf('/') !== -1) m.push({doi:idents.doi});
  if (idents.title !== undefined && idents.title !== null && idents.title.length > 0) m.push({title:idents.title});

  if (m.length === 0) return undefined;

  var s = {};
  if (refresh !== undefined) {
    var d = new Date();
    var t = refresh === true ? d : d.setDate(d.getDate() - refresh);
    s.$and = [{$or:m},{createdAt:{$gte:t}}];
  } else {
    s.$or = m;
  }
  return job_result.findOne(s,{sort:{createdAt:-1}});
}


CLapi.addRoute('job', {
  get: {
    action: function() {
      if ( this.queryParams.apikey ) {
        var user = CLapi.internals.accounts.retrieve(this.queryParams.apikey);
        if (user) {
          var u = user._id;
          var j = job_job.insert({new:true});
          var b = [];
          var r = this.queryParams.refresh;
          Meteor.setTimeout(function() { CLapi.internals.job.create(b,u,r,j); }, 5);
          return {status: 'success', data: {job:j}};
        } else {
          return {statusCode: 401, body: {status: 'error', data: 'unauthorised'}}
        }
      } else {
        return {status: 'success', data: 'The job API'}
      }
    }
  },
  post: {
    //roleRequired: 'root',
    action: function() {
      var maxallowedlength = 3000; // this could be in config or a per user setting...
      var checklength = this.request.body.list ? this.request.body.list.length : this.request.body.length;
      var quota = CLapi.internals.job.quota(this.userId);
      // TODO should partial jobs be accepted, up to remaining quota available / max length?
      // for now jobs that are too big are refused
      if (checklength > maxallowedlength) {
        return {statusCode: 413, body: {status: 'error', data: {length: checklength, max: maxallowedlength, info: checklength + ' too long, max rows allowed is ' + maxallowedlength}}}
      } else if (checklength > quota.available) {
        return {statusCode: 413, body: {status: 'error', data: {length: checklength, quota: quota, info: checklength + ' greater than remaining quota ' + quota.available}}}
      } else {
        var j = job_job.insert({new:true}); // could there be vals passed in that also need to go into the job creator? like lantern wellcome?
        var b = this.request.body;
        var u = this.userId;
        var r = this.queryParams.refresh;
        Meteor.setTimeout(function() { CLapi.internals.job.create(b,u,r,j); }, 5);
        return {status: 'success', data: {job:j,quota:quota, max: maxallowedlength, length: checklength}};
      }
    }
  }
});

CLapi.addRoute('job/:job', {
  get: {
    //roleRequired: 'root',
    action: function() {
      // return the info of the job - the job metadata and the progress so far
      // TODO if user is not the job creator or is not admin, 401
      var job = job_job.findOne(this.urlParams.job);
      if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      if (job) {
        var p = CLapi.internals.job.progress(this.urlParams.job);
        job.progress = p ? p : 0;
        return {status: 'success', data: job}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('job/:job/reload', {
  get: {
    //roleRequired: 'root',
    action: function() {
      return {status: 'success', data: CLapi.internals.job.reload(this.urlParams.job) }
    }
  }
});

CLapi.addRoute('job/:job/progress', {
  get: {
    //roleRequired: 'root',
    action: function() {
      // return the info of the job - the job metadata and the progress so far
      var job = job_job.findOne(this.urlParams.job);
      if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      if (job) {
        var progress = CLapi.internals.job.progress(this.urlParams.job);
        return {status: 'success', data: progress}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('job/:job/todo', {
  get: {
    //roleRequired: 'root',
    action: function() {
      // return the parts of the job still to do, does not check for results found since last progress check
      var job = job_job.findOne(this.urlParams.job);
      if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      if (job) {
        var todo = CLapi.internals.job.todo(this.urlParams.job);
        return {status: 'success', data: todo}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('job/:job/results', {
  get: {
    //roleRequired: 'root',
    action: function() {
      // return the results for this job as JSON
      var job = job_job.findOne(this.urlParams.job);
      if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      // TODO may add restriction on how long old jobs can be returned for 
      // could be implemented by deleting them, or by checking here for how long the user can 
      // retrieve jobs (to be saved in a user config)
      if (!job) return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      var res = CLapi.internals.job.results(this.urlParams.job);
      if ( this.queryParams.format && this.queryParams.format === 'csv' ) {
        // lantern applied specific formatting here based on user options - is that needed somehow too?
        res = CLapi.internals.convert.json2csv(undefined,undefined,res);
        var name = 'results';
        if (job.name) name = job.name.split('.')[0].replace(/ /g,'_') + '_results';
        this.response.writeHead(200, {
          'Content-disposition': "attachment; filename="+name+".csv",
          'Content-type': 'text/csv',
          'Content-length': res.length
        });
        this.response.write(res);
        this.done();
        return {}  
      } else {
        return {status: 'success', data: res}
      }
    }
  }
});

CLapi.addRoute('job/:job/original', {
  get: {
    //roleRequired: 'root',
    action: function() {
      var job = job_job.findOne(this.urlParams.job);
      if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      var fl = [];
      for ( var j in job.list ) {
        var jb = job.list[j];
        if (jb.process) delete jb.process;
        fl.push(jb);
      }
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

CLapi.addRoute('job/jobs', {
  get: {
    //roleRequired: 'root',
    action: function() {
      var results = [];
      var jobs = job_job.find();
      jobs.forEach(function(job) {
        job.processes = job.list ? job.list.length : 0;
        if (job.processes === 0) {
          job_job.remove(job._id);
        } else {
          delete job.list;
          results.push(job);          
        }
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
    }
  }
});

CLapi.addRoute('job/jobs/todo', {
  get: {
    //roleRequired: 'root',
    action: function() {
      var results = [];
      var jobs = job_job.find({done:{$not:{$eq:true}}});
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
      var count = job_job.find({done:{$not:{$eq:true}}}).count();
      job_job.remove({done:{$not:{$eq:true}}});
      // TODO should this remove all processes associated with the jobs being deleted? - and why is deletion here?
      return {status: 'success', total: count}
    }
  }
});

CLapi.addRoute('job/jobs/reload', {
  get: {
    roleRequired: 'root',
    action: function() {
      return {status: 'success', data: CLapi.internals.job.reload() }
    }
  }
});

CLapi.addRoute('job/jobs/:email', {
  get: {
    //roleRequired: 'root',
    action: function() {
      var results = [];
      if ( !( CLapi.internals.accounts.auth('root',this.user) || this.user.emails[0].address === this.urlParams.email ) ) return {statusCode:401,body:{}}
      var jobs = job_job.find({email:this.urlParams.email});
      jobs.forEach(function(job) {
        job.processes = job.list.length;
        delete job.list;
        results.push(job);
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
    }
  }
});

// the next two could be replaced with an index instead
CLapi.addRoute('job/processes', {
  get: {
    action: function() {
      return {status: 'success', data: job_process.find({}).count() }
    }
  }
});
CLapi.addRoute('job/processes/running', {
  get: {
    action: function() {
      return {status: 'success', data: job_process.find({processing:{$eq:true}}).count() }
    }
  }
});
CLapi.addRoute('job/processes/reset', {
  get: {
    //roleRequired: 'root',
    action: function() {
      return {status: 'success', data: CLapi.internals.job.reset() }
    }
  }
});

CLapi.addRoute('job/process/:proc', {
  get: {
    //roleRequired: 'root',
    action: function() {
      return {status: 'success', data: CLapi.internals.job.process(this.urlParams.proc) }
    }
  }
});

CLapi.addRoute('job/status', {
  get: {
    action: function() {
      return {
        status: 'success', 
        data: CLapi.internals.job.status()
      }
    }
  }
});

CLapi.addRoute('job/quota/:email', { // is quota info going to be held by the job system directly?
  get: {
    //roleRequired: 'root',
    action: function() {
      if ( CLapi.internals.accounts.auth('root',this.user) || this.user.emails[0].address === this.urlParams.email ) {
        return {status: 'success', data: CLapi.internals.job.quota(this.urlParams.email) }
      } else {
        return {statusCode:401, body:{}}
      }
    }
  }
});

/*
should this be kept here? does jobs api handle field format for outputs? if so, need different field lists for different kinds of job
CLapi.addRoute('job/fields/:email', {
  post: {
    //roleRequired: 'root',
    action: function() {
      if ( CLapi.internals.accounts.auth('root',this.user) || this.user.emails[0].address === this.urlParams.email ) {
        if (this.user.service.job.profile === undefined) {
          this.user.service.job.profile = {fields:{}};
          Meteor.users.update(this.userId, {$set: {'service.job.profile':{fields:{}}}});
        } else if (this.user.service.job.profile.fields === undefined) {
          this.user.service.job.profile.fields = {};
          Meteor.users.update(this.userId, {$set: {'service.job.profile.fields':{}}});
        }
        for ( var p in this.request.body ) this.user.service.job.profile.fields[p] = this.request.body[p];
        Meteor.users.update(this.userId, {$set: {'service.job.profile.fields':this.user.service.job.profile.fields}});
        return {status: 'success', data: this.user.service.job.profile.fields }
      } else {
        return {statusCode:401, body:{}}
      }
    }
  }
});
*/

CLapi.internals.job = {};

CLapi.internals.job.allowed = function(job,uacc) {
  return job.user === uacc._id || CLapi.internals.accounts.auth('job.admin',uacc);
}

CLapi.internals.job.quota = function(uid) {
  var acc = CLapi.internals.accounts.retrieve(uid);
  var email = acc.emails[0].address;
  var max = 100;
  var admin = CLapi.internals.accounts.auth('job.admin',acc);
  var premium = CLapi.internals.accounts.auth('job.premium',acc,false ); // will job api handle premium account concept?
  if ( admin ) {
    max = 500000;
  } else if ( premium ) {
    max = 5000;
  }
  var backtrack = 30;
  var additional = 0;
  var today = Date.now();
  var until = false;
  var display = false;
  if (acc && acc.service && acc.service.job && acc.service.job.additional) {
    for ( var a in acc.service.job.additional ) {
      var ad = acc.service.job.additional[a];
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
  var j = job_job.find({$and:[{email:email},{createdAt:{$gte:t}}]},{sort:{createdAt:-1}});
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

CLapi.internals.job.status = function() {
  return {
    processes: {
      total: job_process.find().count(),
      running: job_process.find({processing:{$eq:true}}).count()
    },
    jobs: {
      total: job_job.find().count(),
      done: job_job.find({done:{$exists:true}}).count()
    },
    results: job_result.find().count(),
    users: CLapi.internals.accounts.count({"roles.job":{$exists:true}})
  } 
}

CLapi.internals.job.reset = function() {
  // reset all processing processes
  var procs = job_process.find({processing:{$eq:true}});
  var count = 0;
  procs.forEach(function(row) {
    job_process.update(row._id,{$set:{processing:undefined}});
    count += 1;
  });
  return count;
}

CLapi.internals.job.reload = function(jobid) {
  // reload all jobs with processes that still need running
  var ret = 0;
  var j = jobid ? job_job.find({'_id':jobid}) : job_job.find({done:{$not:{$eq:true}}});
  j.forEach(function(job) {
    for ( var l in job.list) {
      var pid = job.list[l].process;
      var proc = job_process.findOne(pid);
      var res;
      if (!proc) res = job_result.findOne(pid);
      if (pid && !proc && !res) {
        var jp = JSON.parse(JSON.stringify(j));
        delete jp.list;
        jp._id = pid;
        jp.refresh = job.refresh;
        job_process.insert(jp);
        ret += 1;
      }
    }
  });
  return ret;
}

CLapi.internals.job.create = function(input,uid,refresh,jid) {
  var user = CLapi.internals.accounts.retrieve(uid);
  var job = {user:uid};
  job.email = user.emails[0].address;
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
    var proc = list[i]; // this should put everything in proc needed to do the find on existing similar jobs
    proc.refresh = refresh;
    var result = job_result.findByIdentifier(proc,refresh);
    if (result) {
      job.list[i].process = result._id;
    } else {
      var process = job_process.findByIdentifier(proc);
      process ? job.list[i].process = process._id : job.list[i].process = job_process.insert(proc);
    }
  }
  if (job.list.length === 0) job.done = true; // bit pointless submitting empty jobs, but theoretically possible. Could make impossible...
  job.new = false;
  if (jid !== undefined) {
    job_job.update(jid,{$set:job});
  } else {
    jid = job_job.insert(job);
  }
  if (job.email) {
    var jor = job.name ? job.name : jid;
    var text = 'Hi ' + job.email + '\n\nThanks very much for submitting your processing job ' + jor + '.\n\n';
    text += 'You can track the progress of your job at ';
    text += 'http://job.test.cottagelabs.com#'; // should this address depend on the service creating the job?
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

CLapi.internals.job.process = function(pid) {
  var proc = job_process.findOne(pid);
  if (!proc) return false;
  job_process.update(proc._id, {$set:{processing:true}});

  // the proc needs to be created with something like this, to have a method to run, 
  // name of method for info and grouping (possibly controlling url output and formatting too - perhaps should be service)
  // also args to run, and tags to find similar jobs
  //var lim = {method:method,name:name,args:args,tags:tags};
  proc.result = proc.method.apply(this,proc.args);
  
  job_result.insert(proc);
  job_process.remove(proc._id);
  
  return proc;
}
CLapi.internals.job.nextProcess = function() {
  // search for processes not already processing, sorted by descending created data
  // add any sort of priority queue checking?
  var p = job_process.findOne({processing:{$not:{$eq:true}}},{sort:{createdAt:-1}});
  if (p) {
    console.log(p._id);
    return CLapi.internals.job.process(p._id);
  } else {
    console.log('No job processes available');
    return false;
  }
}

CLapi.internals.job.progress = function(jobid) {
  var job = job_job.findOne(jobid);
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
        var found = job_result.findOne(job.list[i].process);
        // could add a check for OTHER results with similar IDs - but shouldn't be any, and would have to re-sanitise the IDs
        if ( found ) {
          count += 1;
        }
      }
      p = count/total * 100;      
      if ( p === 100 ) {
        job_job.update(job._id, {$set:{done:true}});
        var jor = job.name ? job.name : job._id;
        var text = 'Hi ' + job.email + '\n\nYour processing job ' + jor + ' is complete.\n\n';
        text += 'You can now download the results of your job at ';
        text += 'http://job.test.cottagelabs.com#'; // what should define job url?
        text += job._id;
        text += '\n\nThe Cottage Labs team\n\n';
        text += 'P.S This is an automated email, please do not reply to it.'
        CLapi.internals.sendmail({
          to:job.email,
          subject:'Job ' + jor + ' completed successfully',
          text:text
        });
      }
    }
    return {progress:p,name:job.name,email:job.email,_id:job._id,new:job.new};
  } else {
    return false;
  }
}

CLapi.internals.job.todo = function(jobid) {
  var job = job_job.findOne(jobid);
  if (job) {
    if (job.done) {
      return [];
    } else {
      var todos = [];
      for ( var i in job.list ) {
        if ( !job_job.findOne(job.list[i].process) ) todos.push(job.list[i]);
      }
      return todos;
    }
  } else {
    return false;
  }
}

CLapi.internals.job.results = function(jobid) {
  var job = job_job.findOne(jobid);
  if (job) {
    var results = [];
    for ( var i in job.list ) {
      var ji = job.list[i];
      var found = job_result.findOne(ji.process);
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

CLapi.internals.job.result = function(rid) {
  var found = rid !== undefined ? job_result.findOne(rid) : undefined;
  if ( found ) {
    // should some users only get certain parts of results, depending on their permissions?
    return found;
  } else {
    return false;
  }
}

CLapi.internals.job.alertdone = function() {
  var j = job_job.find({done:{$not:{$eq:true}}});
  var ret = 0;
  j.forEach(function(job) {
    var progress = CLapi.internals.job.progress(job._id);
    if (progress && progress.progress === 100) {
      ret += 1;
    }
  });
  return ret;
}

CLapi.internals.job.alertstuck = function() {
  var prev = job_meta.findOne('previous_processing_check');
  if (prev === undefined) {
    prev = {_id:'previous_processing_check',list:[],same:false,since:0,howmany:0,change:0};
    job_meta.insert(prev);
  }
  if (prev.howmany === undefined) prev.howmany = 0;
  var howmany = job_process.find().count();
  prev.change = howmany - prev.howmany;
  prev.howmany = howmany;
  var procs = job_process.find({processing:{$eq:true}}).fetch();
  var currents = [];
  var same = true;
  for ( var p in procs ) {
    currents.push(procs[p]._id);
    if ( prev.list.indexOf(procs[p]._id) === -1 ) same = false;
  }
  prev.since = same ? prev.since + 15 : 0;
  prev.same = same;
  prev.list = currents;
  job_meta.update('previous_processing_check',{$set:prev});
  console.log("Stuck job processes check")
  console.log(prev);
  var txt = ''
  if (same && currents.length !== 0 && prev.since >= 30) {
    txt = 'There appear to be ' + currents.length + ' processes stuck on the queue for at least ' + prev.since + ' minutes';
    txt += '\n\nResetting the processes may help, if you are sure you do not want to check the situation first:\n\n';
    txt += 'https://';
    if ( Meteor.settings.dev ) txt += 'dev.';
    txt += 'api.cottagelabs.com/service/job/processes/reset';
    CLapi.internals.mail.send({
      from:'alert@cottagelabs.com',
      to:'sysadmin@cottagelabs.com',
      subject:'CL ALERT: job processes stuck',
      text:txt
    });
    return true;
  } else if ( howmany !== 0 && procs.length === 0 && prev.change >= 0 ) {
    txt = 'There appear to be ' + howmany + ' processes in the system but there appear to be no processes running.';
    txt += '\n\nThe amount of processes has changed by ' + prev.change + ' since last check';
    txt += '\n\nResetting the processes is unlikely to help, but you can try, if you do not want to check the situation first:\n\n';
    txt += 'https://api.cottagelabs.com/service/job/processes/reset';
    CLapi.internals.mail.send({
      from:'alert@cottagelabs.com',
      to:'sysadmin@cottagelabs.com',
      subject:'CL ALERT: job processes may not be running',
      text:txt
    });
    return true;
  } else {
    return false;
  }
}

CLapi.internals.job.dropoldresults = function() {
  // search for results over 180 days old and delete them
  var d = Meteor.settings.cron.job_dropoldresults;
  var r = job_result.find({done:{$not:{$eq:true}}});
  var ret = 0;
  r.forEach(function(res) {
    job_result.remove(res._id);
    ret += 1;
  });
  return ret;
}

CLapi.internals.job.dropoldjobs = function() {
  // search for results over d days old and delete them
  var d = Meteor.settings.cron.job_dropoldjobs;
  var j = job_job.find({done:{$not:{$eq:true}}});
  var ret = 0;
  j.forEach(function(job) {
    job_job.remove(job._id);
    ret += 1;
  });
  return ret;
}

if ( Meteor.settings.cron.job_dropoldjobs ) {
  SyncedCron.add({
    name: 'job_dropoldjobs',
    schedule: function(parser) { return parser.recur().every(24).hour(); },
    job: CLapi.internals.job.dropoldjobs
  });
}
if ( Meteor.settings.cron.job_dropoldresults ) {
  SyncedCron.add({
    name: 'job_dropoldresults',
    schedule: function(parser) { return parser.recur().every(24).hour(); },
    job: CLapi.internals.job.dropoldresults
  });
}
if ( Meteor.settings.cron.job_alertstuck ) {
  SyncedCron.add({
    name: 'job_alertstuck',
    schedule: function(parser) { return parser.recur().every(15).minute(); },
    job: CLapi.internals.job.alertstuck
  });  
}
if ( Meteor.settings.cron.job_alertdone ) {
  SyncedCron.add({
    name: 'job_alertdone',
    schedule: function(parser) { return parser.recur().every(10).minute(); },
    job: CLapi.internals.job.alertdone
  });
}
if ( Meteor.settings.cron.job ) {
  SyncedCron.add({
    name: 'job',
    schedule: function(parser) { return parser.recur().every(1).second(); },
    job: CLapi.internals.job.nextProcess
  });
}




