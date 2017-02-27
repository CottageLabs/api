
clapi_limit = new Mongo.Collection("clapi_limit");

CLapi.addRoute('limit/test', {
  get: {
    roleRequired: 'root',
    action: function() {
      return CLapi.internals.limit.test();
    }
  }
});
CLapi.addRoute('limit/clear', {
  get: {
    roleRequired: 'root',
    action: function() {
      return CLapi.internals.limit.clear();
    }
  }
});
CLapi.addRoute('limit/status', {
  get: {
    action: function() {
      return {status:'success',data: CLapi.internals.limit.status()};
    }
  }
});



CLapi.internals.limit = {};

CLapi.internals.limit.do = function(limit,method,name,args,tags,meta) {
  var Future = Npm.require('fibers/future');
  var moment = Meteor.npmRequire('moment');
  var now = Date.now();
  //clapi_limit.remove({expires:{$lte:now}});
  var previous = clapi_limit.findOne({$and:[{name:name},{tags:tags},{expires:{$gt:now}}]},{sort:{createdAt:-1}});
  var expires = previous ? previous.expires + limit : now + limit;
  var expires_date = moment(expires,"x").format("YYYY-MM-DD HHmm:ss.SSS");
  var created_date = moment(now,"x").format("YYYY-MM-DD HHmm:ss.SSS");
  var lim = {limit:limit,name:name,args:args,tags:tags,expires:expires,expires_date:expires_date,createdAt:now,created_date:created_date};
  clapi_limit.insert(lim);
  console.log('limiting next ' + name + ' at ' + created_date + ' to ' + expires_date);

  if (previous) {
    var delay = previous.expires - now;
    var future = new Future();
    setTimeout(function() { future.return(); }, delay);
    future.wait();
  }
  var res = method.apply(this,args);
  return meta ? {meta:lim,result:res} : res;
};

CLapi.internals.limit.clear = function(name,tags,older) {
  // could be a useful way to clear limits on a particular named method, with optional args and tags filters
  //var match = {$and:[{name:name}]};
  clapi_limit.remove({});
  return {status:'success'};
}

CLapi.internals.limit.status = function() {
  var s = { count: clapi_limit.find().count() };
  if (s.count) {
    s.last = clapi_limit.findOne({expires:{$lte:Date.now()}},{sort:{createdAt:-1}}).expires_date;
    var latest = clapi_limit.findOne({},{sort:{createdAt:-1}});
    s.latest = {time:latest.expires_date,name:latest.name};
  }
  return s;
}

CLapi.internals.limit.test = function() {
  var moment = Meteor.npmRequire('moment');
  var res = {};
  res.one = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 1',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  res.two = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 2',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  res.three = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 3',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  return res;
}




