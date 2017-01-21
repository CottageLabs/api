

CLapi.addRoute('scripts/oabutton/imperialdois2', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var fs = Meteor.npmRequire('fs');
      var doicsv = '/home/cloo/imperialdois3.csv';
      var lines = fs.readFileSync(doicsv).toString().split('\n');
      lines.splice(0,1);
      
      var out = '/home/cloo/imperialdois4.csv';
      fs.writeFileSync(out,'"DOI","URL","source"\n');

      var start = new Date();
      
      var info = {
        length: lines.length,
        count: 0,
        open: 0,
        closed: 0,
        already: 0,
        start: start.getHours() + ':' + start.getMinutes() + '.' + start.getSeconds()
      };
      
      for ( var d in lines ) {
        info.count += 1;
        console.log(info.count);
        if (lines[d].length > 6) {
          if ( lines[d].indexOf('""') !== -1 ) {
            var doi = lines[d].split(',')[0].replace('"','').replace('"','');
            console.log(doi);
            var res = CLapi.internals.academic.resolve(doi);
            if (res.url) {
              fs.appendFileSync(out,'"' + doi + '","' + res.url + '","' + res.source + '"\n');
              info.open += 1;
            } else {
              fs.appendFileSync(out,'"' + doi + '","",""\n');
              info.closed += 1;
            }
            info.last = doi;
          } else {
            info.already += 1;
            fs.appendFileSync(out,lines[d] + '\n');
          }
        }
      }
      
      var end = new Date();
      info.end = end.getHours() + ':' + end.getMinutes() + '.' + end.getSeconds();
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'imperial DOIs complete',
        text: JSON.stringify(info,undefined,2)
      });
      
      return info;

    }
  }
});
