
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
  this.route('profile', {
    path: '/profile',
    onBeforeAction : function() {
      if (!Meteor.userId()) {
        this.render('accounts');
      } else {
        // TODO should add a check for group membership here, but CLapi.cauth is not defined at this point...
        this.next();
      }
    },
    waitOn : function() {
      return Meteor.subscribe('userData');
    },
    action: function() {
      this.render('profile'); 
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
    onBeforeAction : function() {
      if (!Meteor.userId()) {
        this.render('accounts');
      } else if ( ( Meteor.user().roles && Meteor.user().roles[this.params.gid] && Meteor.user().roles[this.params.gid].indexOf('admin') !== -1 ) || (Meteor.user().roles && Meteor.user().roles.__global_roles__ && Meteor.user().roles.__global_roles__.indexOf('root') !== -1) ) {
        this.next();
      } else {
        this.render('accounts');
      }
    },
    waitOn : function() {
      var subs = [Meteor.subscribe('groupusers',this.params.gid),Meteor.subscribe('userData')];
      if ( this.params.gid === 'openaccessbutton' ) {
        subs.push(Meteor.subscribe('requests'));
        subs.push(Meteor.subscribe('blocks'));
      }
      return subs;
    },
    action: function() {
      Session.set("gid",this.params.gid);
      this.render('managegroup');
    }

  });
});
