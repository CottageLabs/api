
// mongo API
// some useful things to do to the mongo db in general
// may not expose as actual API routes... be careful if they are

CLapi.internals.mongo = {};

CLapi.internals.mongo.delete = function(coll,rid) {
  var r;
  if ( rid === undefined ) {
    coll.remove({});
  } else {
    r = coll.findOne(rid);
    if (r) coll.remove(rid);
  }
  return {status: 'success'}
}
