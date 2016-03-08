
// config for nmpje - which also uses mail, which requires process.env.MAIL_URL to be set in server/env.js

Router.map( function () {
  this.route('home', {
    path: '/',
    waitOn : function() {
      return Meteor.subscribe('userData');
    },
    action: function() {
      var page;
      if ( this.request.url.indexOf('accounts.cottagelabs.com') !== -1 ) page = 'accounts';
      if ( this.request.url.indexOf('opendatabutton.org') !== -1 ) page = 'oabutton';
      this.render(page); 
    }
  });
});
