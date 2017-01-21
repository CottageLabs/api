


CLapi.addRoute('scripts/oabutton/xreftest', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var Future = Npm.require('fibers/future');
      var fs = Meteor.npmRequire('fs');
      
      var doicsv = '/home/cloo/top100openclosed.csv';
      var lines = fs.readFileSync(doicsv).toString().split('\n');
      lines.splice(0,1); // assumes headers are at top, so be sure to format the file that way - the original had them at the bottom
      
      var out = '/home/cloo/static/xreftest.csv';
      fs.writeFileSync(out,'"match","score","inDOI","outDOI","inTitle","outTitle"\n');

      var start = new Date();
      
      var info = {
        length: lines.length,
        count: 0,
        suitable: 0,
        unsuitable: 0,
        found: 0,
        notfound: 0,
        matched: 0,
        start: start.getHours() + ':' + start.getMinutes() + '.' + start.getSeconds()
      };
      
      for ( var d in lines ) {
        var future = new Future();
        setTimeout(function() { future.return(); }, 1000);
        future.wait();
        info.count += 1;
        // separate the title first, it is always quoted but other fields are not
        // some titles have quotes and commas in them, hence doing this way. none have ",
        var title = lines[d].split('",')[0];
        var parts = lines[d].replace(title+'",','').split(',');
        if (parts.length === 4) {
          var inTitle = title.replace(/"/g,'').replace(/,/g,'');
          var url = parts[1].replace(/"/g,'');
          var inDOI = url.indexOf('http://dx.doi.org/') === 0 ? url.replace('http://dx.doi.org/','') : '';
          // the test sheet contains URLs, some of which are DOI links - use the ones that are DOI links
          var match = "n/a";
          var score = "n/a";
          var outDOI = '';
          var outTitle = '';
          console.log(info.count);
          console.log(url);
          console.log(inDOI);
          if (inDOI.length > 3 && inTitle.length > 15) {
            info.suitable += 1;
            var res = CLapi.internals.use.crossref.reverse(inTitle);
            if (res.data.doi) {
              outTitle = res.data.title;
              outDOI = res.data.doi;
              score = res.data.score;
              if ( inDOI.toLowerCase() === outDOI.toLowerCase() ) {
                match = "TRUE";
                info.matched += 1
              } else {
                match = "FALSE";
              }
              info.found += 1;
            } else {
              info.notfound += 1;
            }
          } else {
            info.unsuitable += 1;
          }
          fs.appendFileSync(out,'"' + match + '","' + score + '","' + inDOI + '","' + outDOI + '","' + inTitle + '","' + outTitle + '"\n');
          info.last = inDOI;
        }
      }
      
      var end = new Date();
      info.end = end.getHours() + ':' + end.getMinutes() + '.' + end.getSeconds();
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'crossref reverse test complete',
        text: JSON.stringify(info,undefined,2)
      });
      
      return info;

    }
  }
});
