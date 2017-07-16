
// a job runner
// create a job with an object:
/*
{
  user: <user ID (added by API auth when called via API route)>,
  service: <optional service name>,
  name: <a name for this job - via API would be the filename uploaded>,
  method: <the method function to run for each item in list>,
  refresh: <a number of days after which to ignore previous results, or true for ignoring all previous - what to default to?>,
  processes: [
    a list of the opts to pass to the method for each job to be run
    a method with the same opts is considered an identical job
    this list could contain objects or lists depending on what the signature of the method being called expects
    e.g. if the method expects an object of options, this should be a list of objects
    but if the method expects just unnamed ordered comma-separated options, or a list, this should be a list of lists
  ]
}

could a job be a list of processes of different methods?
if so the processes list needs to be an object, with "method","opts" etc
and if those required keys are missing from any process, they could be assumed to be the overarching ones
could be optional - look to see if processes[0] is an object with a key called "method", if so assume this is the case
but if not assume that processes is just a list of opts

is it worth having a chain option, which defaults false but can be set to true
if true, the job list is considered a chain, with each next process doing something with the result of the last
in this case, would have to create processes in reverse, and set chain:true in each process except the "last" (actually first),
and in each next process created set next: to the process ID of the one previously created
then when the system searches for processes to kick off, it should not start any with chain:true
and when any process is finished, if it has chain:true, call the process identified by "next"
until reaching the last one, which has chain:true, but no "next", so then we do completion
would this also require each process to have a way of identifying which part of the previous process result to operate on?
perhaps this chaining feature should be a separate API function which can be used in conjunction with job, like limit is separate...

*/

var moment = Meteor.npmRequire('moment');

job_meta = new Mongo.Collection("job_meta");
job_job = new Mongo.Collection("job_job");
job_process = new Mongo.Collection("job_process");
job_result = new Mongo.Collection("job_result");

job_job.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
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

CLapi.addRoute('job', {
  get: {
    action: function() {
      if ( this.queryParams.apikey ) {
        var user = CLapi.internals.accounts.retrieve(this.queryParams.apikey);
        if (user) {
          var u = user._id;
          var j = job_job.insert({new:true,user:u});
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
    roleRequired: 'root',
    action: function() {
      var maxallowedlength = 3000; // this could be in config or a per user setting...
      var checklength = this.request.body.list ? this.request.body.list.length : this.request.body.length;
      if (checklength > maxallowedlength) {
        return {statusCode: 413, body: {status: 'error', data: {length: checklength, max: maxallowedlength, info: checklength + ' too long, max rows allowed is ' + maxallowedlength}}}
      } else {
        var u = this.userId;
        var j = job_job.insert({new:true,user:u});
        var b = this.request.body;
        var r = this.queryParams.refresh;
        Meteor.setTimeout(function() { CLapi.internals.job.create(b,u,r,j); }, 5);
        return {status: 'success', data: {job:j, max: maxallowedlength, length: checklength}};
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
      if ( !CLapi.internals.job.allowed(job,this.user) ) {
        return {statusCode:401, body:{}}
      } else if (job) {
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
      //if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      if (job) {
        var todo = CLapi.internals.job.todo(this.urlParams.job);
        return {status: 'success', data: todo}
      } else {
        return {statusCode: 404, body: {status: 'error', data: '404 not found'}}
      }
    }
  }
});

CLapi.addRoute('job/:job/remove', {
  get: {
    //roleRequired: 'root',
    action: function() {
      // return the parts of the job still to do, does not check for results found since last progress check
      //if ( !CLapi.internals.job.allowed(job,this.user) ) return {statusCode:401, body:{}}
      return CLapi.internals.job.remove(this.urlParams.job);
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

CLapi.addRoute('job/jobs', {
  get: {
    //roleRequired: 'root',
    action: function() {
      var results = [];
      var jobs = job_job.find();
      jobs.forEach(function(job) {
        if (job.processes && job.processes.length === 0) {
          job_job.remove(job._id);
        } else {
          delete job.processes;
          results.push(job);          
        }
      });
      return {status: 'success', data: {total:results.length, jobs: results} }
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
        job.processes = job.processes.length;
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



CLapi.internals.job = {};

CLapi.internals.job.allowed = function(job,uacc) {
  return job.user === uacc._id || CLapi.internals.accounts.auth('job.admin',uacc);
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
    results: job_result.find().count()
  } 
}

CLapi.internals.job.reset = function() {
  var procs = job_process.find({processing:{$eq:true}});
  var count = 0;
  procs.forEach(function(proc) {
    job_process.update(proc._id,{$set:{processing:undefined}});
    count += 1;
  });
  return count;
}

CLapi.internals.job.reload = function(jobid) {
  // reload all jobs with processes that still need running
  var ret = 0;
  var j = jobid ? job_job.find({'_id':jobid}) : job_job.find({done:{$not:{$eq:true}}});
  j.forEach(function(job) {
    for ( var l in job.processes) {
      var pid = job.processes[l].process;
      var proc = job_process.findOne(pid);
      var res;
      if (!proc) res = job_result.findOne(pid);
      if (pid && !proc && !res) {
        var pr = job.processes[l];
        job_process.insert(pr.process,pr);
        ret += 1;
      }
    }
  });
  return ret;
}

var _findSigned = function(coll,signature,refresh) {
  var s = {};
  if (refresh !== undefined) {
    var d = new Date();
    var t = refresh === true ? d : d.setDate(d.getDate() - refresh);
    s.$and = [{signature:signature},{createdAt:{$gte:t}}];
  } else {
    s.signature = signature;
  }
  return coll.findOne(s,{sort:{createdAt:-1}});  
}
job_process.findSigned = function(signature) { return _findSigned(job_process,signature); }
job_result.findSigned = function(signature,refresh) { return _findSigned(job_result,signature,refresh); }

CLapi.internals.job.create = function(input,uid,refresh,jid) {
  var job = {user:uid};
  job.function = input.function;
  job.name = input.name;
  job.service = input.service;
  job.refresh = refresh !== undefined ? refresh : true; // default to refresh?
  job.processes = [];
  for ( var i in input.processes ) {
    var proc = typeof input.processes[i] !== 'object' || input.processes[i].args === undefined ? {args:input.processes[i]} : input.processes[i];
    proc.function = job.function;
    proc.signature = job.function + '_' + JSON.stringify(proc.args);
    var result = job.refresh && job.refresh !== true ? job_result.findSigned(proc.signature,job.refresh) : false;
    if (result) {
      proc.process = result._id;
    } else {
      var process = job_process.findSigned(proc.signature);
      proc.process = process ? process._id : job_process.insert(proc);
    }
    job.processes.push(proc);
  }
  if (job.processes.length === 0) job.done = true; // bit pointless submitting empty jobs, but theoretically possible. Could make impossible...
  job.new = false;
  if (jid !== undefined) {
    job_job.update(jid,{$set:job});
  } else {
    jid = job_job.insert(job);
  }
  return jid;
}

CLapi.internals.job.process = function(pid) {
  var proc = job_process.findOne(pid);
  if (!proc) return false;
  job_process.update(proc._id, {$set:{processing:true}});
  //proc.result = proc.method.apply(this,proc.args);
  var fn = CLapi;
  var parts = proc.function.split('.');
  for ( var p in parts ) {
    if ( parts[p] !== 'CLapi') fn = fn[parts[p]];
  }
  proc.result = fn(proc.args);
  job_result.insert(proc);
  job_process.remove(proc._id);
  return proc;
}
CLapi.internals.job.nextProcess = function() {
  // add any sort of priority queue checking?
  var p = job_process.findOne({processing:{$not:{$eq:true}}},{sort:{createdAt:-1}});
  if (p) {
    console.log(p._id);
    return CLapi.internals.job.process(p._id);
  } else {
    console.log('No job available');
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
      var total = job.processes.length;
      var count = 0;
      for ( var i in job.processes ) {
        var found = job_result.findOne(job.processes[i].process);
        if ( found ) count += 1;
      }
      p = count/total * 100;
      if ( p === 100 ) {
        job_job.update(job._id, {$set:{done:true}});
        var text = 'Your job ' + (job.name ? job.name : job._id) + ' is complete.';
        var email = job.email;
        if (!email && job.user) email = CLapi.internals.accounts.retrieve(job.user).emails[0].address;
        CLapi.internals.mail.send({
          to:email,
          subject:text,
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
      for ( var i in job.processes ) {
        if ( !job_result.findOne(job.processes[i].process) ) todos.push(job.processes[i]);
      }
      return todos;
    }
  } else {
    return false;
  }
}

CLapi.internals.job.remove = function(jobid) {
  var job = job_job.findOne(jobid);
  if (job) {
    var todos = CLapi.internals.job.todo(jobid);
    if (todos) {
      for ( var pd in todos) job_process.remove(pd.process);
    }
    job_job.remove(jobid);
    return true;
  } else {
    return false;
  }
}

CLapi.internals.job.results = function(jobid) {
  var job = job_job.findOne(jobid);
  if (job) {
    var results = [];
    for ( var i in job.processes ) {
      var ji = job.processes[i];
      var found = job_result.findOne(ji.process);
      if ( found ) results.push(found.result);
    }
    return results;
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




