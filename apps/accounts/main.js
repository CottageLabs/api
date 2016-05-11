
GROUPS = new Mongo.Collection("groups");

Router.map( function () {
  this.route('home', {
    path: '/',
    waitOn : function() {
      return Meteor.subscribe('userData');
    },
    action: function() {
      var page;
      if ( this.request.url.indexOf('accounts.cottagelabs.com') !== -1 || this.request.url.indexOf('test.cottagelabs.com') !== -1 ) page = 'accounts';
      if ( this.request.url.indexOf('opendatabutton.org') !== -1 ) page = 'oabutton';
      this.render(page); 
    }
  });
  this.route('groups', {
    waitOn : function() {
      return Meteor.subscribe('groups');
    },
    path: '/admin'
  });
  this.route('managegroup', {
    path: '/admin/:gid',
    waitOn : function() {
      var subs = [Meteor.subscribe('groupusers',this.params.gid)];
      if ( this.params.gid === 'openaccessbutton' ) {
        subs.push(Meteor.subscribe('requests'));
        subs.push(Meteor.subscribe('blocks'));
      }
      return subs;
    },
    action: function() {
      if ( Meteor.user() ) {
        if ( true ) { //CLapi.cauth(this.params.gid + '.admin',Meteor.user() ) ) {
          Session.set("gid",this.params.gid);
          this.render('managegroup');
        } else {
          this.redirect('/');
        }
      } else {
        this.redirect('/');
      }
    }

  });
});
