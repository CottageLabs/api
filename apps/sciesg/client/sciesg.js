

Meteor.startup(function () {
  Session.set("filedata",[]);
  Session.set("extracted",[]);
});

Template.sciesgSecurity.helpers({
  security: function() {
    return sci_security.findOne(Session.get('sid'));
  },
  keys: function() {
    var keys = [];
    var sec = sci_security.findOne(Session.get('sid'));
    for (var k in sec) {
      if ( ['_id','createdAt'].indexOf(k) === -1 ) keys.push(k);
    }
    return keys;
  },
  values: function(key) {
    var sec = sci_security.findOne(Session.get('sid'));
    if ( sec[key] === true ) {
      return "True";
    } else if ( sec[key] === false ) {
      return "False";
    } else {
      return sec[key];    
    }
  },
  stringify: function(rec) {
    var parts = rec.file.split('/');
    var str = 'File: ' + parts[parts.length-1] + ' ';
    try {
      str += 'Matched: ';
      for ( var m in rec.extracts.matches ) str += rec.extracts.matches[m].result[0] + ' ';
    } catch(err) {}
    return str;
  }
});

Template.sciesgSecurity.events({
 "click #extract": function() {
    Meteor.call('extractsecurity',Session.get('sid'), function(err,res) {
      console.log(res);
      Session.set("extracted",res);
    });
  }
});


Template.sciesgAdmin.helpers({
  securities: function() {
    return sci_security.find();
  },
  acurls: function() {
    return {
      position: "top",
      limit: 50,
      rules: [
        {
          collection: sci_company,
          matchAll: true,
          template: Template.urlPill,
          field: "name"
        }
      ]
    };    
  },
  sciesguploadactions: function() {
    return {
      formData: function() { return { service: 'sciesg' } },
      finished: function(index, fileInfo, context) {
        console.log(fileInfo);
        Meteor.call('extract', fileInfo.name, function(error, result) { 
          var info = {};
          var matched = [];
          info.keywords = result.keywords;
          info.title = result.title.replace(/_/g,' ');
          info.kpi = [];
          for ( var k in result.extracts.matches) {
            var ki = result.extracts.matches[k];
            if ( matched.indexOf(ki.matched) === -1 ) {
              matched.push(ki.matched);
              var title = $.trim(ki.result[0].replace(ki.result[1],''));
              info.kpi.push({title:title, value:ki.result[1]});
            }
          }
          var fls = Session.get("filedata");
          fls.push(info);
          Session.set("filedata",fls);
        });
      }
    }
  }
});

Template.sciesgAdmin.events({
 "autocompleteselect input": function(event, template, doc) {
    Meteor.call('addsecurity',doc._id);
  }
});
