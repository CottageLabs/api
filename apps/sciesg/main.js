
sci_company = new Mongo.Collection("sci_company");
sci_company.before.insert(function (userId, doc) {
  doc.ftstr = doc.name;
  if (doc.exchange) doc.ftstr += ' (' + doc.exchange;
  if (doc.code) doc.ftstr += ' ' + doc.code;
  if (doc.exchange) doc.ftstr += ')';
  if (doc.url) doc.ftstr += ' ' + doc.url;
  doc.createdAt = Date.now();
});
sci_company.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/sci/company/' + this._id, doc);
});
sci_company.before.update(function (userId, doc, fieldNames, modifier, options) {
  var ftstr = doc.name;
  if (doc.exchange) ftstr += ' (' + doc.exchange;
  if (doc.code) ftstr += ' ' + doc.code;
  if (doc.exchange) ftstr += ')';
  if (doc.url) ftstr += ' ' + doc.url;
  modifier.$set.updatedAt = Date.now();
  modifier.$set.ftstr = ftstr;
});
sci_company.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/sci/company/' + doc._id, doc);
});
sci_company.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/sci/company/' + doc._id);
});
//CLapi.addCollection(sci_company);

sci_security = new Mongo.Collection("sci_security");
sci_security.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
sci_security.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/sci/security/' + this._id, doc);
});
sci_security.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
sci_security.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/sci/security/' + doc._id, doc);
});
sci_security.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/sci/security/' + doc._id);
});

Router.map( function () {
  this.route('sciesgIntro', {
    path: '/sciesg',
    action: function() {
      this.render();        
    }
  });
  this.route('sciesgDashboard', {
    path: '/sciesg/dashboard',
    action: function() {
      this.render();        
    }
  });
  this.route('sciesgSecurity', {
    path: '/sciesg/security/:sid',
    waitOn : function() {
      return [
        Meteor.subscribe('securities',this.params.sid)
      ]
    },
    action: function() {
      Session.set('sid',this.params.sid);
      Session.set("extracted",[]);
      this.render();        
    }
  });
  this.route('sciesgAdmin', {
    path: '/sciesg/admin',
    waitOn : function() {
      return [
        Meteor.subscribe('companies'),
        Meteor.subscribe('securities')
      ]
    },
    action: function() {
      this.render();        
    }
  });
});
