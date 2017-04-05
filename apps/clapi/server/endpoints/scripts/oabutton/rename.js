
CLapi.addRoute('scripts/oabutton/rename', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var counts = {updated:0,requests:0};
      
      oab_request.find().forEach(function(req) {
        counts.requests += 1;
        if (req.user && req.user.id) {
          var u = Meteor.users.findOne(req.user.id);
          if (u) {
            var set = {};
            if (!req.user.username && u.username) set['user.username'] = u.username;
            if (!req.user.firstname && u.profile && u.profile.firstname) set['user.firstname'] = u.profile.firstname;
            if (JSON.stringify(set) !== '{}') {
              counts.updated += 1;
              oab_request.update(req._id,{$set:set});
            }
          }
        }
      });
            
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'rename complete',
        text: JSON.stringify(counts,undefined,2)
      });

      console.log(counts);
      return counts;
    }
  }
});
