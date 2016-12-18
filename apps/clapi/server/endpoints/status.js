
// an API status reporter

CLapi.addRoute('status', {
  get: {
    action: function() {
      return CLapi.internals.status();
    }
  }
});

CLapi.addRoute('status/check', {
  get: {
    action: function() {
      return CLapi.internals.check();
    }
  }
});

CLapi.internals.status = function() {
  var ret = {
    up: {
      live:true,
      local:true,
      cluster:true,
      dev:true
    },
    accounts: {
      total: CLapi.internals.accounts.count(),
      online: CLapi.internals.accounts.onlinecount()
    },
    groups: 'TODO',
    db: 'TODO',
    cron: 'TODO'
  }
  try { Meteor.http.call('GET','https://api.cottagelabs.com'); } catch(err) { ret.up.live = false; }
  try { Meteor.http.call('GET','https://lapi.cottagelabs.com'); } catch(err) { ret.up.local = false; }
  try { Meteor.http.call('GET','https://dev.api.cottagelabs.com'); } catch(err) { ret.up.dev = false; }
  try { Meteor.http.call('GET','https://capi.cottagelabs.com'); } catch(err) { ret.up.cluster = false; }
  // TODO if cluster is up could read the mup file then try getting each cluster machine too, and counting them
  try { ret.index = CLapi.internals.es.status(); } catch(err) { ret.index = false; }
  try { ret.lantern = CLapi.internals.service.lantern.status(); } catch(err) { ret.lantern = false; }
  try { ret.openaccessbutton = CLapi.internals.service.oab.status(); } catch(err) { ret.openaccessbutton = false; }
  return ret;
};

CLapi.internals.check = function() {
  // for every use endpoint, send a request and check that the response looks like some stored known response
  // first check is, do we still get an answer back? and perhaps how long did it take?
  // check all params exist, look for new ones, look for different values, and give details of difference
  // for service endpoints, could check that all are responding as expected? 
  // Maybe pointless, if this runs, they should - but could be a good check after deploying new code?
  // In which case, do same for all of our own endpoints
  // and for academic endpoints, could check that they return what would be expected too
  // for accounts and groups? Try creating a user/group, logging in, changing membership, then deleting?
  var check = {
    status: 'success,change,error',
    check:{
      elasticsearch: CLapi.internals.es.check()
    }
  };
  // TODO some sort of overall analysis to determine what overall status should be
  // if overall status is not success, email sysadmin with details
  return check;
}

// could add a cron to run check every day and email a sysadmin


