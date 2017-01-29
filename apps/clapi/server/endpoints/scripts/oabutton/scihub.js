

CLapi.addRoute('scripts/oabutton/scihub', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var readline = Meteor.npmRequire('readline');
      var fs = Meteor.npmRequire('fs');
      var tsv = '/home/cloo/scihub_data/sep2015.tab';
      
      var start = new Date();
      
      var info = {
        count: 0,
        start: start.getHours() + ':' + start.getMinutes() + '.' + start.getSeconds()
      };
      
      var Future = Meteor.npmRequire('fibers/future');
      var byline = Meteor.npmRequire('byline');
      var future = new Future();
      var instream = fs.createReadStream(tsv);
      var stream = byline.createStream(instream);
      stream.on('data', Meteor.bindEnvironment(function (line) {
        if (line) {
          info.count += 1;
          console.log(info.count);
          var parts = line.toString().split('\t');
          var ds = new Date(parts[0]).valueOf();
          var rec = {
            created_date: parts[0],
            createdAt: ds,
            doi: parts[1],
            _id: parts[2],
            country: parts[3],
            city: parts[4],
            location: {
              geo: {
                lat: parts[5].split(',')[0],
                lon: parts[5].split(',')[1]
              }
            }
          }
          CLapi.internals.es.insert('/scihub/sep2015/' + rec._id,rec);
        } else {
          future.return();
        }
      }));
      future.wait();
      
      var end = new Date();
      info.end = end.getHours() + ':' + end.getMinutes() + '.' + end.getSeconds();
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'scihub complete',
        text: JSON.stringify(info,undefined,2)
      });
      
      return info;

    }
  }
});
