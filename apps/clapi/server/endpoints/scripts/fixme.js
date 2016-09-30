CLapi.addRoute('scripts/fixme', {
  get: {
    //authRequired: true,
    roleRequired: 'root',
    action: function() {
      Meteor.users.remove({api:{$exists:false}});
      //Meteor.users.update(u._id,{$set:{'security.httponly':false}});
      return {};
    }
  }
});
