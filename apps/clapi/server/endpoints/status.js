
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
      return CLapi.internals.statuscheck();
    }
  }
});

CLapi.internals.status = function() {
  return {
    accounts: {
      total: CLapi.internals.accounts.count(),
      online: CLapi.internals.accounts.onlinecount()
    },
    groups: 'TODO',
    lantern: CLapi.internals.service.lantern.status(),
    openaccessbutton: CLapi.internals.service.oabutton.stats()
  }
};

CLapi.internals.statuscheck = function() {
  // for every use endpoint, send a request and check that the response looks like some stored known response
  // first check is, do we still get an answer back? and perhaps how long did it take?
  // check all params exist, look for new ones, look for different values, and give details of difference
  // for service endpoints, could check that all are responding as expected? 
  // Maybe pointless, if this runs, they should - but could be a good check after deploying new code?
  // In which case, do same for all of our own endpoints
  // and for academic endpoints, could check that they return what would be expected too
  // for accounts and groups? Try creating a user/group, logging in, changing membership, then deleting?
  var status = {
    status: 'success,change,error',
    stats: CLapi.internals.status(), 
    check:{
      elasticsearch: CLapi.internals.es.check()
    }
  };
  // TODO some sort of overall analysis to determine what overall status should be
  // if overall status is not success, email sysadmin with details
  return status;
}

// could add a cron to run statuscheck every day and email a sysadmin


