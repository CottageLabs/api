
OAB_Blocked = new Mongo.Collection("oabutton_blocked");
OAB_Blocked.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
OAB_Blocked.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oabutton/blocked/' + this._id, doc);
});
OAB_Blocked.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
OAB_Blocked.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oabutton/blocked/' + doc._id, doc);
});
OAB_Blocked.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oabutton/blocked/' + doc._id);
});

OAB_Request = new Mongo.Collection("oabutton_request");
OAB_Request.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
OAB_Request.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/oabutton/request/' + this._id, doc);
});
OAB_Request.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
OAB_Request.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/oabutton/request/' + doc._id, doc);
});
OAB_Request.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/oabutton/request/' + doc._id);
});

Router.map( function () {
  this.route('oabuttonsupportrequests', {
    path: '/support-requests'
  });
  this.route('oabuttonaccount', {
    path: '/account',
    waitOn : function() {
      return Meteor.subscribe('userData')
    },
    action: function() {
      if ( Meteor.user() ) {
        this.render();
      } else {
        this.redirect('/login');
      }
    }
  });
  this.route('oabuttonadmin', {
    // restrict this to admin users
    path: '/odbadmin'
  });
  this.route('oabuttonaccountadmin', {
    path: '/account/:aid',
    action: function() {
      if ( Meteor.user() ) {
        if ( Roles.userIsInRole(Meteor.userId(), 'root', 'openaccessbutton') ) {
          // allow an admin user to see the page of a user, with a warning
          this.render('oabuttonaccount'); // so make this a special account page render that does not render the currentUser, but the identified one
        } else {
          this.redirect('/account');          
        }
      } else {
        this.redirect('/login');
      }
    }
  });
  this.route('oabuttonlogin', {
    path: '/login',
    action: function() {
      if ( Meteor.user() ) {
        this.redirect('/account');
      } else {
        this.render();
      }
    }
  });
  this.route('oabuttonupload', {
    path: '/response/:rid',
    waitOn : function() {
      return Meteor.subscribe('request',undefined,this.params.rid);
    },
    action: function() {
      //var resp = store_receiver.find(this.params.rid);
      var req = OAB_Request.findOne({receiver:this.params.rid});
      Session.set('respid',this.params.rid);
      if (req) {
        if (req.received) {
          Session.set('reqid',req._id);
          Session.set('validated',req.received.validated);
          Meteor.call('listreceivedfiles',Session.get('respid'),function(err,resp) { Session.set('files',resp); });
          this.render('oabuttonuploadreceived');
        } else if (this.params.query.refuse) {
          Meteor.call('oabrefuse',req.id);// can pass a reason here, if the page asks for one
          this.render('oabuttonuploadrefuse');
        } else if (this.params.query.hold) {
          Meteor.call('oabhold',req.id,this.params.query.hold);
          Session.set('holdlength',this.params.query.hold);
          this.render('oabuttonuploadhold');
        } else {
          Session.set('reqid',req._id);
          this.render();
        }
      } else {
        this.render('oabuttonuploadinvalid');
      }
    }
  });
  this.route('oabuttonrequest', {
    path: '/request/:rid',
    waitOn : function() {
      return Meteor.subscribe('request', this.params.rid)
    },
    action : function() {
      var r = OAB_Request.findOne(this.params.rid);
      Session.set('url', r.url);
      Meteor.subscribe('blockedforurl', r.url);
      Session.set('requestid', this.params.rid);
      this.render();                
    }
  });
  this.route('oabuttonstory', {
    path: '/story/:sid',
    waitOn : function() {
      return [
        Meteor.subscribe('block', this.params.sid),
        Meteor.subscribe('requestrelatedtoblock', this.params.sid)
      ]
    },
    action : function() {
      Session.set('blockedid', this.params.sid);
      this.render();                
    }
  });
  
});

