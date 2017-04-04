
var usernames = function() {
  var fs = Meteor.npmRequire('fs');
  var recs = fs.readFileSync('/home/cloo/userdata.csv').toString().split('\n');
  recs.splice(0,1);

  var output = {start:recs.length,updated:0};
  for (var k in recs) {
    if (recs[k].length > 4) {
      var uid = undefined;
      var fn = undefined;
      var ln = undefined;
      var parts = recs[k].split(',');
      try { uid = parts[0]; } catch(err) {}
      try { fn = parts[1]; } catch(err) {}
      try { ln = parts[2]; } catch(err) {}
      console.log(uid + ' ' + fn + ' ' + ln);
      var user = Meteor.users.findOne(uid);
      if ( user && fn) {
        console.log('updating ' + uid);
        output.updated += 1;
        var set = {'profile.firstname':fn};
        if (ln) set['profile.lastname'] = ln;
        Meteor.users.update(uid, {$set: set});
      }
    }
  }
  console.log(output);
  return output;
}


CLapi.addRoute('scripts/oabutton/usernames', {
  get: {
    roleRequired: 'root',
    action: function() {
      return {status: 'success', data: usernames()};
    }
  }
});
