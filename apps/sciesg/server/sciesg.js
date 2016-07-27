
var newest = function(dir,suffix) {
  var best = false;
  var ntime = 0;
  var fs = Meteor.npmRequire('fs');
  var files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    if (suffix === undefined || files[i].indexOf('.' + suffix.replace('.','')) !== -1) {
      var nt = fs.statSync(dir+files[i]).mtime.getTime();
      if (nt > ntime) {
        ntime = nt;
        best = files[i];
      }
    }
  }  
  return best;
}


Meteor.methods({
  newest: function() {
    var fn = newest(Meteor.settings.uploadServer.uploadDir + '/sciesg/','pdf');
    return fn;
  },
  extract: function(fn) {
    var dir = Meteor.settings.uploadServer.uploadDir + '/sciesg/';
    if (fn === undefined) fn = newest(dir,'pdf');
    console.log('starting extract on ' + fn);
    if (fn) {
      var fl = dir + fn;
      var fs = Meteor.npmRequire('fs');
      var content = fs.readFileSync(fl);
      var text = CLapi.internals.convert.file2txt(undefined, content, {preserveLineBreaks:true});
      fs.writeFileSync(dir + fn.split('.')[0] + '.txt', text);
      var keywords = CLapi.internals.tdm.keywords(text.toLowerCase(),{ngrams:1,min:3,score:true,limit:20,stem:true,len:5});
      var matchers = [
        '/Sales volumes.*?([0-9.,]+)/gi',
        '/Total revenue.*?([0-9.,]+)/gi',
        '/Gross Profit.*?([0-9.,]+)/gi',
        '/Capital expenditure.*?([0-9.,]+)/gi',
        '/Net Debt.*?([0-9.,]+)/gi',
        '/Headroom.*?([0-9.,]+)/gi',
        '/Committed Bank Facilities.*?([0-9.,]+)/gi',
        '/Corporate Bonds.*?([0-9.,]+)/gi',
        '/Total air emissions.*([0-9.,]+)/gi'
      ]
      var extracts = CLapi.internals.tdm.extract({content:text,matchers:matchers});
      var res = {text:text,keywords:keywords,extracts:extracts,title:fn.split('.')[0]};
      fs.writeFileSync(dir + fn.split('.')[0] + '.json', JSON.stringify(res,"","  "));
      return res;
    } else {
      return false;
    }
  },
  files: function() {
    var fs = Meteor.npmRequire('fs');
    return fs.readdirSync(Meteor.settings.uploadServer.uploadDir + '/openaccessbutton/');
  }
});






