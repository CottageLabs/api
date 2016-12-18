
CLapi.addRoute('scripts/oabutton/reprocess', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      var counts = {count:0,requests:0,supports:0,blacklist:0,availabilities:0,discovered:0,nouser:0,already:0};
      
      counts.dousers = this.queryParams.users ? true : false;
      counts.dorequests = this.queryParams.requests ? true : false;
      counts.doblocks = this.queryParams.blocks ? true : false;
      counts.doavailabilities = this.queryParams.availabilities ? true : false;
      counts.wipe = this.queryParams.wipe ? true : false;
      
      counts.size = this.queryParams.size ? parseInt(this.queryParams.size).toString() : '10';
      counts.from = this.queryParams.from ? parseInt(this.queryParams.from).toString() : '0';

      if (counts.wipe) {
        // wipe the ES indexes and the oab requests before starting
        CLapi.internals.es.delete('/oab');
        //CLapi.internals.es.delete('/clapi/accounts');
        oab_support.remove({});
        oab_availability.remove({});
        oab_request.remove({});
      }

      var mk = this.queryParams.mk;
      
      if (counts.dousers) {
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
          Meteor.users.update(uacc._id,{$set:{'service.openaccessbutton':oab}});
        }
      }

      if (counts.doavailabilities) {
        var avails = oab_availability.find({'discovered':{$exists:false}}).fetch();
        counts.availabilities = avails.length;
        for ( var a in avails ) {
          var aa = avails[a];
          var acheck = CLapi.internals.service.oab.availability({url:aa.url,nosave:true});
          var discovered = {article:false,data:false};
          for ( var ra in acheck.availability ) {
            if (acheck.availability[ra].type === 'article') discovered.article = acheck.availability[ra].url;
            if (acheck.availability[ra].type === 'data') discovered.data = acheck.availability[ra].url;
          }
          if (discovered.article !== false || discovered.data !== false) counts.discovered += 1;
          oab_availability.update(aa._id,{$set:{discovered:discovered}});
        }
      }
      
      if (counts.dorequests && mk) {
        // get all old requests
        var requests = Meteor.http.call('GET','https://api.cottagelabs.com/es/oabutton/request/_search?q=NOT%20test:true&size='+counts.size+'&from='+counts.from+'&apikey='+mk).data;
        counts.oldrequests = requests.hits.total;
        for ( var r in requests.hits.hits ) {
        //var requests = OAB_Request.find().fetch();
        //counts.oldrequests = requests.length;
        //for ( var r in requests ) {
          //var ress = requests[r];
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
      }

      if (counts.doblocks && mk) {
        // get all non-test blocks
        var blocks = Meteor.http.call('GET','https://api.cottagelabs.com/es/oabutton/blocked/_search?q=NOT%20test:true%20AND%20user:*&size='+counts.size+'&from='+counts.from+'&apikey='+mk).data;
        counts.oldblocks = blocks.hits.total;
        for ( var b in blocks.hits.hits ) {
        //var blocks = OAB_Blocked.find().fetch(); // on live can look up direct
        //counts.oldblocks = blocks.length;
        //for ( var b in blocks ) {
          //var res = blocks[b];
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
              var alr = oab_request.findOne(rec._id)
              if (alr) {
                counts.already += 1;
              } else {
                var exists = oab_request.findOne({$and:[{url:rec.url},{type:rec.type}]});
                if (exists) {
                  CLapi.internals.service.oab.support(exists._id,rec.story,user._id);
                  counts.supports += 1;
                } else {
                  var created = CLapi.internals.service.oab.request(rec,user._id);
                  created === false ? counts.blacklist += 1 : counts.requests += 1;
                }
              }
            } else {
              counts.nouser += 1;
            }
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
