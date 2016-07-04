
Meteor.startup(function () {
  Session.set("filedata",[]);
});

Template.sciesg.helpers({
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

Template.sciesg.events({
});
