
// a syncedcron API

CLapi.addRoute('cron', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'create regular jobs via syncedcron - stub in progress'} };
    }
  }
});

CLapi.addRoute('cron/:job', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'get info about regular job'} };
    }
  },
  post: {
    action: function() {
      return {status: 'success', data: {info: 'create regular job or edit some of its settings with provided values'} };
    }
  },
  put: {
    action: function() {
      return {status: 'success', data: {info: 'overwrite regular job with provided values'} };
    }
  },
  delete: {
    action: function() {
      return {status: 'success', data: {info: 'delete regular job'} };
    }
  }
});

CLapi.addRoute('cron/:job/run', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'run regular job NOW'} };
    }
  }
});
