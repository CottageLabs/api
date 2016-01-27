
// elasticsearch API

// handle authn and authz for es indexes and types (and head plugins, backups, etc, if necessary)
// NOTE: if an index/type can be public, just make it public and have nginx route to it directly, saving app load.

CLapi.addRoute('es', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  }
});
