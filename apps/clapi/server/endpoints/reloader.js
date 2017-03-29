
clapi_reloader = new Mongo.Collection("clapi_reloader");

var clapi_reloader_running = false;

CLapi.addRoute('reloader', {
  get: {
    action: function() {
      return Meteor.settings.reload !== undefined && clapi_reloader_running ? Meteor.settings.reload : [];
    }
  }
});

// start/stop
CLapi.addRoute('reloader/:action', {
  get: {
    action: function() {
      CLapi.internals.reloader.reload(this.urlParams.action);
      return Meteor.settings.reload !== undefined && clapi_reloader_running ? Meteor.settings.reload : [];
    }
  }
});

CLapi.addRoute('reloader/latest', {
  get: {
    action: function() {
      return CLapi.internals.reloader.latest(this.queryParams.since,this.queryParams.site);
    }
  }
});


CLapi.internals.reloader = {};

// TODO on startup need to trigger this function to get everything going
CLapi.internals.reloader.reload = function(action) {
  if (action === undefined) {
    action = clapi_reloader_running ? 'stop' : 'start';
  }
  console.log('Reloader ' + action);
  var fs = require('fs');
  var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = dir + '/' + file;
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            walk(file, function(err, res) {
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
  };

  if (Meteor.settings.reload !== undefined) {
    clapi_reloader_running = action === 'stop' ? false : true;
    for ( var r in Meteor.settings.reload ) {
      var list = Meteor.settings.reload[r];
      var fulllist = [];
      for ( var l in list ) {
        // for thing in list, if a file, watch it. If not a file (simple approach is things ending with /), recurse everything under it (and into subfolders) and watch them all
        // prob need to auto ignore certain subfolders, maybe all . folders?
        if (list[l][list[l].length-1] === '/') {
          walk(list[l], function(err,results) {
            for ( var fl in results ) {
              if ( fulllist.indexOf(results[fl]) === -1 && results[fl].indexOf('.git') === -1 ) fulllist.push(results[fl]);
            }
          });
        } else {
          if (fulllist.indexOf(list[l]) === -1) fulllist.push(list[l]);
        }
      }
      for ( var f in fulllist ) {
        if (action === 'stop') {
          fs.unwatchFile(fulllist[f]);
        } else {
          fs.watchFile(fulllist[f], function(curr, prev) {
            var exists = clapi_reloader.findOne(r);
            if (exists) {
              clapi_reloader.update(r,{$set:{changed:Date.now(),file:fulllist[f]}});
            } else {
              clapi_reloader.insert({
                _id: r,
                file: fulllist[f],
                changed: Date.now()
              });
            }
          });
        }
      }
    }
  }
}
/* how does this interact with already having a Meteor.startup in accounts, and possibly elsewhere... can it just startup like lantern starts syncedcron, by one call to reload() ? or can use a start/stop?
Meteor.startup(function () {
  if ( Meteor.settings.reloader ) {
    CLapi.internals.reloader.reload();
  }
});*/

CLapi.internals.reloader.latest = function(since,site) {
  if (since === undefined) since = 60000;
  var matcher = {};
  if (since !== 'all') matcher.changed = {$gte: Date.now() - since};
  if (site !== undefined) matcher._id = site;
  return clapi_reloader.find(matcher).fetch();
}

