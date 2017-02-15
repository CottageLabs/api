

CLapi.addRoute('scripts/oabutton/importratings', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var fs = Meteor.npmRequire('fs');
      var sheet = '/home/cloo/oabutton_ratings.csv';
      var ratings = CLapi.internals.convert.csv2json(undefined,fs.readFileSync(sheet).toString());
      
      var start = new Date();
      
      var info = {
        stories: [],
        length: ratings.length,
        count: 0,
        found: 0,
        updated: 0,
        start: start.getHours() + ':' + start.getMinutes() + '.' + start.getSeconds()
      };
      
      for ( var r in ratings ) {
        info.count += 1;
        if (ratings[r].Story && ratings[r].Story.length > 3 && ratings[r].Rating && parseInt(ratings[r].Rating)) {
          console.log(info.count);
          var records = oab_request.find({story:ratings[r].Story});
          records.forEach(function(rec) {
            info.found += 1;
            if (rec.rating === undefined) {
              info.stories.push(ratings[r].Story);
              oab_request.update(rec._id,{$set:{rating:ratings[r].Rating}});
              info.updated += 1;
            }         
          });
        }
      }
      
      var end = new Date();
      info.end = end.getHours() + ':' + end.getMinutes() + '.' + end.getSeconds();
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'import ratings',
        text: JSON.stringify(info,undefined,2)
      });
      
      return info;

    }
  }
});
