
CLapi.addRoute('scripts/oabutton/filterold', {
  get: {
    roleRequired: 'root',
    action: function() {
      
      var qp = this.queryParams;
      qp.requests = true;
      qp.users = true;
      // and pass in qp scrape to run scrape for email, and qp execute to actually save changes
      
      var counts = {updated:0,removed:0,requests:0,presentemailremoved:0,scrape:0,newvalidemail:0,users:0,userupdated:0};
      
      var professions = ['Student','Health professional','Patient','Researcher','Librarian'];
      if (qp.requests) {
        oab_request.find().forEach(function(req) {
          counts.requests += 1;        
          if (!req.url || CLapi.internals.service.oab.blacklist(req.url)) {
            counts.removed += 1;
            if (qp.execute) oab_request.remove(req._id);
          } else {
            var update = {};
            if (req.rating) {
              update.rating = parseInt(req.rating) === 3 || parseInt(req.rating) === 4 || parseInt(req.rating) === 5 ? 'pass' : 'fail';
            }
            if (req.user) {
              if (req.user.profession === undefined) {
                update['user.profession'] = 'Other';
              } else if ( professions.indexOf(req.user.profession) === -1 ) {
                if (req.user.profession) {
                  update['user.profession'] = req.user.profession[0].toUpperCase() + req.user.profession.substring(1,req.user.profession.length);
                  if (professions.indexOf(update['user.profession']) === -1) {
                    if (update['user.profession'].toLowerCase() === 'academic') {
                      update['user.profession'] = 'Researcher';
                    } else if (update['user.profession'].toLowerCase() === 'doctor') {
                      update['user.profession'] = 'Health professional';
                    } else {
                      update['user.profession'] = 'Other';
                    }
                  }
                } else {
                  update['user.profession'] = 'Other';
                }
              }
              if (['help','moderate'].indexOf(req.status) !== -1) {
                if ( req.email && ( CLapi.internals.service.oab.dnr(req.email) || !CLapi.internals.mail.validate(req.email).is_valid ) ) {
                  counts.presentemailremoved += 1;
                  req.email = undefined;
                  update.email = '';
                }
                if ( !req.email ) {
                  counts.scrape += 1;
                  if (qp.scrape) {
                    try {
                      var s = CLapi.internals.service.oab.scrape(req.url);
                      if ( s.email ) {
                        counts.newvalidemail += 1;
                        update.email = s.email;
                      }
                    } catch(err) {}
                  }
                }
              }
            }
            if (JSON.stringify(update) !== '{}') {
              if (qp.execute) oab_request.update(req._id,{$set:update});
              counts.updated += 1;
            }
          }
        });
      }
      
      if (qp.users) {
        Meteor.users.find({"roles.openaccessbutton":{$exists:true}}).forEach(function(u) {
          counts.users += 1;
          if (u && u.service && u.service.openaccessbutton && u.service.openaccessbutton.profile) {
            var uup = {};
            if (!u.service.openaccessbutton.profile.profession) {
              uup['service.openaccessbutton.profile.profession'] = 'Other';
            } else if ( professions.indexOf(u.service.openaccessbutton.profile.profession) === -1 ) {
              uup['service.openaccessbutton.profile.profession'] = u.service.openaccessbutton.profile.profession[0].toUpperCase() + u.service.openaccessbutton.profile.profession.substring(1,u.service.openaccessbutton.profile.profession.length);
              if (professions.indexOf(uup['service.openaccessbutton.profile.profession']) === -1) {
                if (uup['service.openaccessbutton.profile.profession'].toLowerCase() === 'academic') {
                  uup['service.openaccessbutton.profile.profession'] = 'Researcher';
                } else if (uup['service.openaccessbutton.profile.profession'].toLowerCase() === 'doctor') {
                  uup['service.openaccessbutton.profile.profession'] = 'Health professional';
                } else {
                  uup['service.openaccessbutton.profile.profession'] = 'Other';
                }
              }
            }
            if (JSON.stringify(uup) !== '{}') {
              counts.userupdated += 1;
              if (qp.execute) Meteor.users.update(u._id,{$set:uup});
            }
          }
        });
      }
      
            
      CLapi.internals.sendmail({
        from: 'sysadmin@cottagelabs.com',
        to: 'mark@cottagelabs.com',
        subject: 'script complete',
        text: JSON.stringify(counts,undefined,2)
      });

      console.log(counts);
      return counts;
    }
  }
});
