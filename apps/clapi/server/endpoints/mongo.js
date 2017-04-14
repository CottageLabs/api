
// mongo API

CLapi.addRoute('mongo/edit/:coll', {
  post: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.edit(this.urlParams.coll,undefined,this.request.body);
    }
  }
});
CLapi.addRoute('mongo/edit/:coll/:rec', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.edit(this.urlParams.coll,this.urlParams.rec);
    }
  },
  post: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.edit(this.urlParams.coll,this.urlParams.rec,this.request.body);
    }
  },
  put: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.edit(this.urlParams.coll,this.urlParams.rec,this.request.body,true);
    }
  },
  delete: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.edit(this.urlParams.coll,this.urlParams.rec,undefined,undefined,true);
    }
  }
});

CLapi.addRoute('mongo/remove/:coll', {
  delete: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll)
    }
  }
});
CLapi.addRoute('mongo/remove/:coll/:rec', {
  delete: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.delete(this.urlParams.coll,this.urlParams.rec)
    }
  }
});
CLapi.addRoute('mongo/backup/:coll', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.backup(this.urlParams.coll)
    }
  }
});
CLapi.addRoute('mongo/index/:idx/:coll', {
  get: {
    roleRequired:'root',
    action: function() {
      return CLapi.internals.mongo.index(this.urlParams.idx,this.urlParams.coll)
    }
  }
});

CLapi.internals.mongo = {};

CLapi.internals.mongo.edit = function(coll,rec,record,replace,del) {
  var co;
  if ( coll === 'accounts' ) {
    co = Meteor.users;
  // add additional collection types here that should be allowed to be altered in this way
  // manual adding keeps more control. Can disable easily too
  } else {
    return {status: 'error'}  
  }
  if (record) {
    if (rec) {
      if (replace === true) {
        if ( record._id && record._id !== rec ) return {status: 'error'};
        if ( record._id === undefined ) record._id = rec;
        co.update(rec,record);
        return co.findOne(rec);
      } else {
        co.update(rec,{$set:record});
        return co.findOne(rec);
      }
    } else {
      record._id = co.insert(record);
      return record;
    }
  } else if (rec) {
    if (del === true) {
      co.remove(rec);
      return {status: 'success'}
    } else {
      return co.findOne(rec);
    }
  } else {
    return {status: 'error'}
  }
}

CLapi.internals.mongo.delete = function(coll,rec) {
  if ( rec === undefined ) rec = {};
  //if ( coll === 'oab_request' ) oab_request.remove(rec);
  if ( coll === 'lantern_jobs' ) lantern_jobs.remove(rec);
  if ( coll === 'lantern_processes' ) lantern_processes.remove(rec);
  if ( coll === 'lantern_results' ) lantern_results.remove(rec);
  if ( coll === 'academic_licence' ) academic_licence.remove(rec);
  if ( coll === 'academic_resolved' ) academic_resolved.remove(rec);
  if ( coll === 'hidden_gems' ) hidden_gems.remove(rec);
  //if ( coll === 'users' ) Meteor.users.remove(rec);
  if ( coll === 'leviathan_statement' ) leviathan_statement.remove(rec);
  if ( coll === 'leviathan_score' ) leviathan_score.remove(rec);
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


