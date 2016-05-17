
// an API status reporter


// an email forwarder

CLapi.addRoute('status', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.status() };
    }
  }
});

CLapi.addRoute('status/check', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.statuscheck() };
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
    openaccessbutton: 'TODO',
    academic: 'TODO',
    cron: 'TODO'
  }
};

CLapi.internals.statuscheck = function() {
  var status = CLapi.internals.status();
  status.check = 'TODO: check available use endpoints, and perhaps other things, to see if they are up and respond with results as expected'
  return status;
}

