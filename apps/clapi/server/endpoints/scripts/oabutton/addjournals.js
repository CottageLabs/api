

CLapi.addRoute('scripts/oabutton/addjournals', {
  get: {
    roleRequired: 'root',
    action: function() {
      //return {}; // uncomment this to make this work again
      
      var counts = {count:0,requests:0,rescrape:0,resherpa:0,journal:0,sherpa:0};
      
      counts.size = this.queryParams.size ? parseInt(this.queryParams.size).toString() : '10';
      counts.from = this.queryParams.from ? parseInt(this.queryParams.from).toString() : '0';

      //var requests = Meteor.http.call('GET','https://api.openaccessbutton.org/requests?size='+counts.size+'&from='+counts.from).data;
      //counts.requests = requests.hits.total;
      //for ( var r in requests.hits.hits ) {
      var requests = oab_request.find().fetch();
      counts.requests = requests.length;
      for ( var r in requests ) {
        //var ress = requests.hits.hits[r]._source;
        var ress = requests[r];
        var update = {};
        if (!ress.journal && ress.url) {
          counts.rescrape += 1;
          var meta = CLapi.internals.service.oab.scrape(ress.url,undefined,undefined,ress.doi);
          if (meta) {
            if (meta.journal) {
              counts.journal += 1;
              ress.journal = meta.journal;
              update.journal = meta.journal;
            }
            if (ress.keywords === undefined && meta.keywords) update.keywords = meta.keywords;
            if (!ress.title && meta.title) update.title = meta.title;
            if (!ress.doi && meta.doi) update.doi = meta.doi;
            if (!ress.email && meta.email) update.email = meta.email;
            if (ress.author === undefined && meta.author) update.author = meta.author;
            if (!ress.issn && meta.issn) update.issn = meta.issn;
            if (!ress.publisher && meta.publisher) update.publisher = meta.publisher;
          }
        }
        if (ress.journal && (ress.sherpa === undefined || !ress.sherpa.color)) {
          counts.resherpa += 1;
          try {
            var sherpa = CLapi.internals.use.sherpa.romeo.search({jtitle:ress.journal});
            update.sherpa = {color:sherpa.data.publishers[0].publisher[0].romeocolour[0]};
            counts.sherpa += 1;
          } catch(err) {}
        }
        if (JSON.stringify(update) !== '{}') oab_request.update(ress.id,{$set:update});
        counts.count += 1;
      }

      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'add journals complete',
        text: JSON.stringify(counts,undefined,2)
      });

      console.log(counts);
      return counts;
    }
  }
});
