
// store API - to store files and provide controlled access to them
// TODO should this be able to store information about certain files and their permissions?
// if so how are permissions written? Is there a route to submit permissions about a stored file?
// if no permissions submitted is it assumed to be public? If public, who can delete it?
// should this API route just be a map to the store app that runs separately, and is accessed via gateway?
// so multiple API machines can be running and send requests to the store, and the gateway routes to wherever it actually is
// which would have to be a local route so that it was not exposed to the wider internet directly
CLapi.addRoute('store', {
  get: {
    authRequired: true,
    action: function() {
      // which users can access the store content listing? Any authenticated user?
    }
  }
});
CLapi.addRoute('store/:fh', { // TODO how to pick up arbitrary route depth
  // can part of store put stuff in a public folder? So anything that needs no auth can just be retrieved directly via nginx?
  get: {
    authRequired: true,
    action: function() {
      // if this is a directory return the directory listing - if authorised to view it
      // which users can get certain files, and how can I serve the file directly?
    }
  },
  post: {
    authRequired: true,
    action: function() {
      // which users can post files, and where can they post them to?
      // should directory creation be separate, and on PUT? And if so, should it require different permissions to posting files?
      // if directory creation is separate, is there then also implicit permissions on who can submit or access things in certain folders?
      // could put files in directory structure that mirrors groups and roles, 
      // putting files in the location of the lowest role that should be able to access them
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      // which users can delete files, and which ones can they delete?
    }
  }
});
