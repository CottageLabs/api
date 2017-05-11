

CLapi.addRoute('scripts/oabutton/dois', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var fs = Meteor.npmRequire('fs');
      var doicsv = '/home/cloo/oabutton_dois.csv';
      var dois = fs.readFileSync(doicsv).toString().split('\n');
      dois.splice(0,1);
      
      var out = '/home/cloo/oabutton_dois_results.csv';
      fs.writeFileSync(out,'"DOI","URL","source"\n');

      var start = new Date();
      
      var info = {
        length: dois.length,
        count: 0,
        open: 0,
        closed: 0,
        start: start.getHours() + ':' + start.getMinutes() + '.' + start.getSeconds()
      };
      
      for ( var d in dois ) {
        var doi = dois[d].replace(',','');
        if (doi.length > 3) {
          info.count += 1;
          console.log(info.count);
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
        }
      }
      
      var end = new Date();
      info.end = end.getHours() + ':' + end.getMinutes() + '.' + end.getSeconds();
      
      CLapi.internals.sendmail({
        from: 'alert@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'oabutton DOIs checked',
        text: JSON.stringify(info,undefined,2)
      });
      
      return info;

    }
  }
});
