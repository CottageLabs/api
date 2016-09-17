CLapi.addRoute('scripts/fixme', {
  post: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      var u = CLapi.internals.accounts.retrieve('mark@cottagelabs.com');
      Meteor.users.update(u._id,{$set:{'security.httponly':false}});
      return {};
    }
  }
});
