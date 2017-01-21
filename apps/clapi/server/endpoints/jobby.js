
// TODO should become a standalone job runner, like what is in lantern

// The Lantern API
/*
jobby_meta = new Mongo.Collection("jobby_meta");
jobby_job = new Mongo.Collection("jobby_job");
jobby_process = new Mongo.Collection("jobby_process");
jobby_result = new Mongo.Collection("jobby_result");

jobby_job.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
jobby_process.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
jobby_result.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
*/
