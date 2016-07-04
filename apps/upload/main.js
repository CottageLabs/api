
Router.map( function () {
  this.route('fileupload', {
    path: '/uploads',
    action: function() {
      // need some logic on who can upload, and if not allowed, redirect somewhere or show error
      if (!Meteor.userId()) {
        this.render('accounts');
      } else {
        this.render();        
      }
    }
  });
});
