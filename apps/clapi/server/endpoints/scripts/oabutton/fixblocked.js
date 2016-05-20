
// old records have these keys, need a script to clean them up and check for nonsense content:
// [u'last_updated', u'author', u'url', u'created_date', u'api_key', u'id', u'doi', u'journal', u'story', u'authoremails', u'title', u'wishlist']
// [u'last_updated', u'author', u'url', u'created_date', u'api_key', u'id', u'doi', u'journal', u'story', u'authoremails', u'title', u'wishlist', u'emails[2]', u'emails[3]', u'emails[1]', u'emails[0]', u'and
// roid', u'location', u'metadata', u'email', u'emails[4]', u'emails[6]', u'emails[5]', u'emails[7]']
// nonsense could be in the url, or in the story, or possibly by author
// for good ones, author > user, authoremails > email. the rest direct match below, or should be ignored

var fs = Meteor.npmRequire('fs');

var oabinput = '/home/cloo/migrates/oabutton/oab_02022016_2311/blocked.json';
var oabjsonout = '/home/cloo/migrates/oabutton/oab_02022016_2311/blocked_fixed.json';
var oabcsvout = '/home/cloo/migrates/oabutton/oab_02022016_2311/blocked_fixed.csv';

var fixblocked = function() {
  var recs = JSON.parse(fs.readFileSync(oabinput));
  var userlocs = {};
  var recs_keys_fixed = [];
  for ( var i in recs.hits.hits ) {
    var rec = recs.hits.hits[i]._source;
    if (rec.authoremails) {
      rec.email = rec.authoremails;
      delete rec.authoremails;
    }
    if (typeof rec.email === 'string') rec.email = [rec.email];
    if (rec.author) {
      rec.user = rec.author; 
      delete rec.author;
    }
    if (rec.api_key) delete rec.api_key;
    if (rec.id) delete rec.id;
    if (rec.wishlist) delete rec.wishlist;
    if (rec.android) {
      rec.plugin = 'android'; 
      delete rec.android;
    }
    if (rec.last_updated) {
      rec.updated_date = rec.last_updated;
      delete rec.last_updated;
    }
    if (rec.location && userlocs[rec.user] === undefined ) userlocs[rec.user] = rec.location;
    if (rec.metadata === undefined ) rec.metadata = {};
    if (rec.title) {
      rec.metadata.title = rec.title; 
      delete rec.title;
    }
    if (rec.journal) {
      rec.metadata.journal = {name: rec.journal}; 
      delete rec.journal;
    }
    if (rec.doi) {
      rec.metadata.identifier = [{type:'doi',id:rec.doi}]; 
      delete rec.doi;
    }
    if (rec.metadata && rec.metadata.journal && typeof rec.metadata.journal !== 'object') rec.metadata.journal = {name:rec.metadata.journal};
    if (rec['emails[0]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[0]']) === -1 ) rec.email.push(rec['emails[0]']); 
      delete rec['emails[0]'];
    }
    if (rec['emails[1]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[1]']) === -1 ) rec.email.push(rec['emails[1]']); 
      delete rec['emails[1]'];
    }
    if (rec['emails[2]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[2]']) === -1 ) rec.email.push(rec['emails[2]']); 
      delete rec['emails[2]'];
    }
    if (rec['emails[3]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[3]']) === -1 ) rec.email.push(rec['emails[3]']); 
      delete rec['emails[3]'];
    }
    if (rec['emails[4]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[4]']) === -1 ) rec.email.push(rec['emails[4]']); 
      delete rec['emails[4]'];
    }
    if (rec['emails[5]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[5]']) === -1 ) rec.email.push(rec['emails[5]']); 
      delete rec['emails[5]'];
    }
    if (rec['emails[6]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[6]']) === -1 ) rec.email.push(rec['emails[6]']); 
      delete rec['emails[6]'];
    }
    if (rec['emails[7]']) {
      if (rec.email === undefined) rec.email = [];
      if (rec.email.indexOf(rec['emails[7]']) === -1 ) rec.email.push(rec['emails[7]']); 
      delete rec['emails[7]'];
    }
    recs_keys_fixed.push(rec);
  }
  
  var recs_cleaned = [];
  var tests = 0;
  var foundlocs = 0;
  for ( var k in recs_keys_fixed ) {
    var rc = recs_keys_fixed[k];
    // fixes the location data if it was missing and we had it for this user from another record
    if (!rc.location && userlocs[rc.user]) {
      rc.location = userlocs[rc.user];
      foundlocs += 1;
    }
    // then set as test if obviously is one
    if ( rc.user === undefined ) {
      rc.user = 'NO USER!'; 
      rc.test = true;
    }
    if ( rc.url === undefined ) {
      rc.url = 'NO URL!'; 
      rc.test = true;
    }
    if ( rc.story === undefined ) rc.story = '';
    if (rc.url.indexOf('chrome') !== -1 || rc.url.indexOf('openaccessbutton') !== -1 || rc.user.indexOf('admin') !== -1 ) {
      rc.test = true; 
      tests += 1;
    }
    recs_cleaned.push(rc);
    
  }
  console.log('tests ' + tests + ', found locs ' + foundlocs);
  fs.writeFileSync(oabjsonout,JSON.stringify(recs_cleaned,"","  "));
  fs.writeFileSync(oabcsvout,'"user","url","story","test"\n');
  var recordcount = 0;
  for ( var ln in recs_cleaned ) {
    recordcount += 1;
    var tf = recs_cleaned[ln];
    var line = '"' + tf.user + '","' + tf.url.replace('"','') + '","' + tf.story.replace('"','').replace('\n','') + '","';
    if (tf.test) line += 'true';
    line += '"\n';
    fs.appendFileSync(oabcsvout,line);
  }

  return {records: recordcount, tests: tests, located: foundlocs};
}


CLapi.addRoute('scripts/oabutton/fixblocked', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      if (this.queryParams.csv) {
        if (this.queryParams.refresh === undefined) fixblocked();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/csv'
          },
          body: fs.readFileSync(oabcsvout)
        }
      } else if (this.queryParams.json) {
        if (this.queryParams.refresh === undefined) fixblocked();
        return JSON.parse(fs.readFileSync(oabjsonout));
      } else {
        return {status: 'success', data: fixblocked()};      
      }
    }
  }
});
