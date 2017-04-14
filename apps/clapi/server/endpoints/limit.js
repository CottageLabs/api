
clapi_limit = new Mongo.Collection("clapi_limit");
clapi_limit_ping = new Mongo.Collection("clapi_limit_ping");

CLapi.addRoute('limit/test', {
  get: {
    roleRequired: 'root',
    action: function() {
      return CLapi.internals.limit.test();
    }
  }
});

CLapi.addRoute('limit/ping', {
  get: {
    roleRequired: 'root',
    action: function() {
      var moment = Meteor.npmRequire('moment');
      var ping = {
        createdAt: Date.now()
      }
      ping.created_date = moment(ping.createdAt,"x").format("YYYY-MM-DD HHmm:ss.SSS");
      return clapi_limit_ping.insert(ping);
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
  // NOTE moment formats to system time, which I note is different on the docker boxes (UTC) than the main box (BST)
  // this does not affect the running of jobs because they check against the now unix timestamp which is UTC
  // but when viewing the limit status, it can look odd because the formatted dates come out with an hour difference sometimes
  // can fix this with moment.utc() if desirable, but not necessary - would look better in one way being uniform, but perhaps 
  // worse in being uniformly out of sync with UK viewiers for half the year (and it is only admins who look at it anyway)
  // https://momentjs.com/docs/#/displaying/
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
  clapi_limit_ping.remove({});
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

// TODO this test should be changed to use the /limit/ping route to create ping records, then can 
// check the created date of those records against the expected limits. Can check across cluster 
// by calling multiple cluster machines to run the job at the same time, and should see the same 
// spacing but across more requests
CLapi.internals.limit.test = function() {
  var moment = Meteor.npmRequire('moment');
  var res = {};
  res.one = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 1',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  res.two = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 2',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  res.three = CLapi.internals.limit.do(300000,CLapi.internals.mail.send,"CLapi.internals.mail.send",[{from:'alert@cottagelabs.com',to:'mark@cottagelabs.com',subject:'LIMIT 3',text:moment(Date.now(),"x").format("YYYY-MM-DD HHmm:ss.SSS")}],undefined,true);
  return res;
}




