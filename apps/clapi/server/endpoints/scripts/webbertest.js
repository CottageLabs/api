
CLapi.addRoute('scripts/webbertest', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      
      var ex = {};
      if (this.queryParams.surfup) {
        var exurl = 'https://' + this.queryParams.surfup + '@' + 'pcoms.lucy.surfsara.nl/pcoms/visit/....';
        ex = Meteor.http.call('GET',exurl);
      }
      
      var results = {
        loop: this.queryParams.loop ? parseInt(this.queryParams.loop) : 6000,
        cl: {
          url: 'gateway.cottagelabs.com/webbertest/visit',
          time: 0,
          count: 0,
          success: 0,
          fail: 0
        },
        surf: {
          url: 'pcoms.lucy.surfsara.nl/webbertest/visit',
          time: 0,
          count: 0,
          success: 0,
          fail: 0
        }
      }
      
      var send = function(which) {
        var url = 'https://' + this.queryParams[which+'up'] + '@' + results[which].url;
        var start = process.hrtime();
        for ( var i = 0; i < results.loop; i++ ) {
          results[which].count += 1;
          var sent = Meteor.http.call('POST',url,ex);
          if (sent.statusCode === 200) {
            results[which].success += 1;
          } else {
            results[which].fail += 1;
          }
        }
        var prec = process.hrtime(start)[1] / 1000000;
        results[which].time = process.hrtime(start)[0] + "s, " + prec.toFixed(3) + "ms";
      }
      
      if (this.queryParams.docl && this.queryParams.clup && this.queryParams.surfup) send('cl');
      if (this.queryParams.dosurf && this.queryParams.surfup) send('surf');
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'webber test complete',
        text: JSON.stringify(results,undefined,2)
      });
      console.log(results);
      return results;
    }
  }
});