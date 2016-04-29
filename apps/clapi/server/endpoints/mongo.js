
// mongo API
// some useful things to do to the mongo db in general
// may not expose as actual API routes... be careful if they are

// convenience to remove jobs, processes, results. should have admin auth or be removed
CLapi.addRoute('mongo/remove/:coll', {
  delete: {
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll)
    }
  }
});
CLapi.addRoute('mongo/remove/:coll/:rec', {
  delete: {
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll,this.urlParams.rec)
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
