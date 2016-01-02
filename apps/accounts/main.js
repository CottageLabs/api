
// config for nmpje - which also uses mail, which requires process.env.MAIL_URL to be set in server/env.js
LOGIN_CODE_TIMEOUT_MINUTES = 5;
LOGIN_CODE_LENGTH = 12;
SECURITY_CODE_HASH_LENGTH = 40;
ADMIN_ACCOUNT_ID = "mark@cottagelabs.com";
MY_DOMAIN = "accounts.cottagelabs.com";

Router.map( function () {
  this.route('homepage', {
    path: '/',
    waitOn : function() {
        return Meteor.subscribe('userData');
    },
    action: function() {
      this.render('accounts');
    }
  });
});
