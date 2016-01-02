//CLapi.addCollection(Meteor.roles); // temp
// groups API
// TODO groups for user accounts are implicit - the user is the root of that group
// users can delegate roles on their user account group to other users, so - 
// do user accounts actually have to be represented in groups? To store custom config data? Or are they default groups?
// similarly, what about system user accounts and the corresponding system groups - they are implicit, must they be explicit?
CLapi.addRoute('groups', {
  get: {
    action: function() {
      // return a list of all known groups
      return {status: 'success', data: {} };
    }
  }
});
CLapi.addRoute('groups/:group', {
  get: {
    authRequired: true,
    action: function() {
      // is this info available to anyone who is logged in?
      // find the custom info about this group, should it have any. This would be:
      // public - if true, anyone can join?
      // default role - a default role to be given to people joining the group? Does this make sense anywhere?
      // cascading - custom list of cascading roles for this group
      // roles - list of roles allowed in this group
      // owner - the ID of the account that made this group
      return {status: 'success', data: {} };
    }
  },
  put: {
    authRequired: true,
    action: function() {
      // who can create groups?
      // who can put group data once it exists?
      // create a new group with the given name, and if there is JSON content in the POST, update its custom settings
    }
  },
  post: {
    authRequired: true,
    action: function() {
      // who can create groups?
      // who can post to groups once they exist?
      // create a new group with the given name, and if there is JSON content in the POST, update the data that is provided
    }
  },
  delete: {
    authRequired: true,
    action: function() {
      // who can delete a group? Presumably just group controllers
      // does deleting a group remove its info from the user accounts too?
      // Probably not - the group may be restored. Perhaps users could be informed of groups they are in that no longer exist
    }
  }
});
// TODO would it be useful to have a list of all roles on a group?
// would it be useful to have a count and list of all users in a group?
