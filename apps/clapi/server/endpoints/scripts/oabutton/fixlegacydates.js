
CLapi.addRoute('scripts/oabutton/fixlegacydates', {
  get: {
    roleRequired: 'root',
    action: function() {
      var counts = {count:0,fixed:0};
      var moment = Meteor.npmRequire('moment');
      var requests = oab_request.find().fetch();
      counts.count = requests.length;
      
      for ( var r in requests ) {
        var fix = {};
        var res = requests[r];
        if (res.legacy && res.legacy.created_date) {
          counts.fixed += 1;
          res.createdAt = moment(res.legacy.created_date,"YYYY-MM-DD HHmm").valueOf();
          fix.createdAt = res.createdAt;
        }
        fix.created_date = moment(res.createdAt,"x").format("YYYY-MM-DD HHmm");
        if (res.updatedAt) fix.updated_date = moment(res.updatedAt,"x").format("YYYY-MM-DD HHmm");
        
        oab_request.update(ress._id,{$set:fix});
      }
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'fix legacy dates complete',
        text: JSON.stringify(counts,undefined,2)
      });

      console.log(counts);
      return counts;
    }
  }
});
