
// mongo API
// some useful things to do to the mongo db in general
// may not expose as actual API routes... be careful if they are

// convenience to remove jobs, processes, results. should have admin auth or be removed
CLapi.addRoute('mongo/remove/:coll', {
  roleRequired:'root',
  delete: {
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll)
    }
  }
});
CLapi.addRoute('mongo/remove/:coll/:rec', {
  roleRequired:'root',
  delete: {
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll,this.urlParams.rec)
    }
  }
});
CLapi.addRoute('mongo/backup/:coll', {
  roleRequired:'root',
  get: {
    action: function() {
      return CLapi.internals.mongo.backup(this.urlParams.coll)
    }
  }
});
CLapi.addRoute('mongo/index/:idx/:coll', {
  roleRequired:'root',
  get: {
    action: function() {
      return CLapi.internals.mongo.index(this.urlParams.idx,this.urlParams.coll)
    }
  }
});

CLapi.internals.mongo = {};

CLapi.internals.mongo.delete = function(coll,rec) {
  if ( rec === undefined ) rec = {};
  if ( coll === 'lantern_jobs' ) lantern_jobs.remove(rec);
  if ( coll === 'lantern_processes' ) lantern_processes.remove(rec);
  if ( coll === 'lantern_results' ) lantern_results.remove(rec);
  if ( coll === 'academic_licence' ) academic_licence.remove(rec);
  if ( coll === 'academic_resolved' ) academic_resolved.remove(rec);
  return {status: 'success'}
}

CLapi.internals.mongo.backup = function(coll) {
  var fs = Meteor.npmRequire('fs');
  var outdir = Meteor.settings.mongo.backupFolder;
  outdir += '/' + coll;
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
  var fn = outdir + '/' + Date.now() + '.json';
  var recs;
  if ( coll === 'oab_blocked' ) recs = OAB_Blocked.find().fetch();
  // should change this to a loop over results without the fetch, writing into the file
  fs.writeFileSync(fn,JSON.stringify(recs,"","  "));
  if (recs) {
    return {status: 'success', total: recs.length, coll: coll}
  } else {
    return {status:'error'}
  }
}

CLapi.internals.mongo.index = function(idx,coll,del,mapping) {
  if (del === undefined) del = true;
  // can add generic indexing capability here, but should keep a settings-based control on what indexes it can operate on,
  // as it is potentially very destructive
  if (coll.toLowerCase() === 'oab_blocked') {
    var bulks = OAB_Blocked.find().fetch();
    if (del) CLapi.internals.es.delete('/oabutton/blocked');
    var res = CLapi.internals.es.import(bulks,false,'oabutton','blocked',undefined,undefined,undefined,true);
    return {status:'success',data:res};
  } else {
    return {status:'error'}
  }
}


