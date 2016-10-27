
CLapi.addRoute('scripts/oabutton/reprocess', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      // wipe the ES indexes and the oab requests before starting
      CLapi.internals.es.delete('/oab')
      oab_support.remove({});
      oab_availability.remove({});
      oab_request.remove({});
      var counts = {count:0,requests:0,supports:0,blacklist:0,nouser:0,already:0};
      var size = '15000';
      
      var users = Meteor.users.find({$and:[{'service.openaccessbutton':{$exists:true}},{'service.openaccessbutton.profile':{$exists:false}}]}).fetch();
      counts.users = users.length;
      for ( var u in users ) {
        var uacc = users[u];
        var oab = uacc.service.openaccessbutton;
        oab.profile = {orcid:"",affiliation:""};
        if (oab.profession) {
          oab.profile.profession = oab.profession;
          delete oab.profession;
        }
        if (oab.confirm_terms) {
          oab.profile.confirm_terms = oab.confirm_terms;
          delete oab.confirm_terms;
        }
        if (oab.confirm_public) {
          oab.profile.confirm_public = oab.confirm_public;
          delete oab.confirm_public;
        }
        if (oab.mailing_list) delete oab.mailing_list;
        //Meteor.users.update(uacc._id,{$set:{'service.openaccessbutton':oab}});
      }
      
      // get all non-test blocks
      /*var blocks = Meteor.http.call('GET','https://api.cottagelabs.com/service/oabutton/query/blocked?q=NOT%20test:true%20AND%20user:*&size='+size).data;
      counts.oldblocks = blocks.hits.total;
      for ( var b in blocks.hits.hits ) {
      //var blocks = OAB_Blocked.find().fetch(); // on live can look up direct
      //counts.oldblocks = blocks.length;
      //for ( var b in blocks ) {
      //  var res = blocks[b];
        var res = blocks.hits.hits[b]._source;
        counts.count += 1;
        if (res.url) {
          var rec = {_id:res._id,url:res.url};
          if (res.story) rec.story = res.story;
          if (res.createdAt) rec.createdAt = res.createdAt;
          if (res.plugin) rec.plugin = res.plugin;
          rec.type = res.type ? res.type : 'article';
          
          if (res.metadata) {
            if (res.metadata.title) rec.title = res.metadata.title;
            if (res.metadata.identifier && res.metadata.identifier.length > 0 && res.metadata.identifier[0].type.toLowerCase() === 'doi') rec.doi = res.metadata.identifier[0].id;
          }
          
          if (res.location) rec.location = res.location; // if not present, look up for other records by user?
          rec.legacy = res.legacy ? res.legacy : {};
          rec.legacy.oab_odb_integration = true;
          
          // if no user, do nothing (loses about 3000 records that have no user, but check for ones that have user but no matching account found)
          var user;
          var mk = this.queryParams.mk;
          if (res.user) {
            try {
              user = Meteor.http.call('GET','https://api.cottagelabs.com/accounts/'+res.user+'?apikey='+mk).data;
            } catch(err) {}
          }
          //if (res.user) user = CLapi.internals.accounts.retrieve(res.user); // on live can look up directly

          if (user) {
            rec.user = {
              id: user._id,
              username: user.username
            }
            try { rec.user.email = user.emails[0].address; } catch(err) {}
            var exists = oab_request.findOne({$and:[{url:rec.url},{type:rec.type}]});
            if (exists) {
              CLapi.internals.service.oab.support(exists._id,rec.story,user._id);
              counts.supports += 1;
            } else {
              var created = CLapi.internals.service.oab.request(rec,user._id);
              created === false ? counts.blacklist += 1 : counts.requests += 1;
            }
          } else {
            counts.nouser += 1;
          }
        }
      }*/
      
      // get all old requests too
      var requests = Meteor.http.call('GET','https://api.cottagelabs.com/service/oabutton/query/request?q=NOT%20test:true&size='+size).data;
      counts.oldrequests = requests.hits.total;
      for ( var r in requests.hits.hits ) {
      //var requests = OAB_Request.find().fetch();
      //counts.oldrequests = requests.length;
      //for ( var r in requests ) {
      //  var ress = requests[r];
        var ress = requests.hits.hits[r]._source;
        counts.count += 1;
        var already = oab_request.findOne(ress._id)
        if (already) {
          counts.already += 1
        } else {
          var ex = oab_request.findOne({$and:[{url:ress.url},{type:ress.type}]});
          if (ex) {
            CLapi.internals.service.oab.support(ex._id,ress.story,ress.user.id);
            counts.supports += 1;
          } else {
            var crtd = CLapi.internals.service.oab.request(ress,ress.user.id);
            crtd === false ? counts.blacklist += 1 : counts.requests += 1;
          }
        }
      }
      
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'reprocess complete',
        text: JSON.stringify(counts,undefined,2)
      });

      console.log(counts);
      return counts;
    }
  }
});