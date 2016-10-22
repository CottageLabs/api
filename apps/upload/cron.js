
// a syncedcron API

// this system uses syncedcron
// https://github.com/percolatestudio/meteor-synced-cron

// so this endpoint should just do useful things like list the jobs available, maybe start and stop them or run them one-off, etc
// could give back some status on jobs that are happening. There is a log somewhere, that caches results for some period.

// generic cron jobs could also be defined in here
// and specific ones if really desired, but most of those are more easily defined at the bottom of the code they relate to

// perhaps should move the syncedCron.start call into here though... where is it anyway?

CLapi.addRoute('cron', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'create regular jobs via syncedcron - stub in progress'} };
    }
  }
});

