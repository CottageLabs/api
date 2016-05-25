

var getoldblocked = function() {
  var recs = Meteor.http.call('GET','http://oabutton.cottagelabs.com/query/blocked/_search?q=*&size=10000').data;
  //var urlemails = {};
  var userlocs = {};
  var recs_keys_fixed = [];
  for ( var i in recs.hits.hits ) {
    var rec = recs.hits.hits[i]._source;
    if (rec.metadata === undefined ) rec.metadata = {};
    rec.type = 'article';
    rec.legacy = {legacy:true};
    if (rec.author) {
      if (typeof rec.author === 'string') {
        rec.user = rec.author;
      } else {
        rec.metadata.author = [];
        for ( var a in rec.author ) {
          rec.metadata.author.push({name:rec.author});
        }
      }
      delete rec.author;
    }
    if (rec.api_key) delete rec.api_key;
    if (rec.id) {
      rec.legacy.id = rec.id;
      delete rec.id;
    }
    if (rec.wishlist) {
      rec.legacy.wishlist = rec.wishlist;
      delete rec.wishlist;
    }
    if (rec.android) {
      rec.legacy.plugin = 'android'; 
      delete rec.android;
    }
    if (rec.created_date) {
      rec.legacy.created_date = rec.created_date;
      delete rec.created_date;
    }
    if (rec.last_updated) {
      rec.legacy.last_updated = rec.last_updated;
      delete rec.last_updated;
    }
    if (rec.location && rec.user && userlocs[rec.user] === undefined ) userlocs[rec.user] = rec.location;
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
    if (rec.authoremails !== undefined) {
      if (rec.authoremails) rec.email = rec.authoremails;
      delete rec.authoremails;
    }
    if (rec.email !== undefined && typeof rec.email === 'string') rec.email = [rec.email];
    if (rec.email === undefined) rec.email = [];
    if (rec['emails[0]']) {
      if (rec.email.indexOf(rec['emails[0]']) === -1 ) rec.email.push(rec['emails[0]']); 
      delete rec['emails[0]'];
    }
    if (rec['emails[1]']) {
      if (rec.email.indexOf(rec['emails[1]']) === -1 ) rec.email.push(rec['emails[1]']); 
      delete rec['emails[1]'];
    }
    if (rec['emails[2]']) {
      if (rec.email.indexOf(rec['emails[2]']) === -1 ) rec.email.push(rec['emails[2]']); 
      delete rec['emails[2]'];
    }
    if (rec['emails[3]']) {
      if (rec.email.indexOf(rec['emails[3]']) === -1 ) rec.email.push(rec['emails[3]']); 
      delete rec['emails[3]'];
    }
    if (rec['emails[4]']) {
      if (rec.email.indexOf(rec['emails[4]']) === -1 ) rec.email.push(rec['emails[4]']); 
      delete rec['emails[4]'];
    }
    if (rec['emails[5]']) {
      if (rec.email.indexOf(rec['emails[5]']) === -1 ) rec.email.push(rec['emails[5]']); 
      delete rec['emails[5]'];
    }
    if (rec['emails[6]']) {
      if (rec.email.indexOf(rec['emails[6]']) === -1 ) rec.email.push(rec['emails[6]']); 
      delete rec['emails[6]'];
    }
    if (rec['emails[7]']) {
      if (rec.email.indexOf(rec['emails[7]']) === -1 ) rec.email.push(rec['emails[7]']); 
      delete rec['emails[7]'];
    }
    if (rec.email) {
      rec.legacy.email = rec.email;
      delete rec.email;
    }
    //if (rec.url && rec.legacy.email && rec.legacy.email.length > 0) urlemails[rec.url] = rec.legacy.email;
    if (rec.url) {
      if (rec.url.indexOf('chrome') === -1 && rec.url.indexOf('openaccessbutton') === -1 && rec.url.indexOf('about:') === -1) {
        if ( (rec.user && rec.user.toLowerCase().indexOf('admin') === -1 && rec.user.toLowerCase().indexOf('eardley') === -1) || !rec.user ) {
          recs_keys_fixed.push(rec);
        }
      }
    }
  }
  return {total: recs_keys_fixed.length, records: recs_keys_fixed, started: recs.hits.hits.length, locations: userlocs}; //, urlemails: urlemails};
}


var getreallyoldblocked = function() {
  var oabinput = '/home/cloo/migrates/oabutton/oabold/oaevent_old_system_blocked.csv';
  var fs = Meteor.npmRequire('fs');
  var inp = fs.readFileSync(oabinput).toString();
  var recs = CLapi.internals.convert.csv2json(undefined,inp);
  var userlocs = {};
  var records = [];
  for ( var i in recs ) {
    var rec = recs[i];
    rec.type = 'article';
    rec.legacy = {legacy:true};
    if (rec.id !== undefined) {
      rec.legacy.id = rec.id;
      delete rec.id;
    }
    if (rec.metadata === undefined) rec.metadata = {};
    if (rec.story === undefined) rec.story = '';
    if (rec.doi) {
      rec.metadata.identifier = [{type:'doi',id:rec.doi}]; 
      delete rec.doi;
    }
    if (rec.doi) {
      rec.legacy.email = rec.authoremails;
      delete rec.authoremails;
    }
    if ( rec.user_slug ) {
      rec.user = rec.user_slug;
      delete rec.user_slug;
    }
    if ( rec.accessed ) {
      rec.legacy.created_date = rec.accessed;
      delete rec.accessed;
    }
    if (rec.location) {
      rec.location = {location: rec.location, geo: {}}
    } else {
      rec.location = {geo:{}};
    }
    if ( rec.coords_lat ) {
      rec.location.geo.lat = rec.coords_lat;
      delete rec.coords_lat;
    }
    if ( rec.coords_lng ) {
      rec.location.geo.lon = rec.coords_lng;
      delete rec.coords_lng;
    }
    if (rec.location.geo.lon && rec.user && userlocs[rec.user] === undefined ) userlocs[rec.user] = rec.location;
    if ( rec.description ) {
      var parts = rec.description.split('\r\n');
      rec.metadata.title = parts[0].replace('Title: ','');
      try {
        var authors = parts[1].split(',');
        rec.metadata.author = [];
        for ( var a in authors ) {
          rec.metadata.author.push({name: authors[a]});
        }
      } catch (err) {}
      try {rec.metadata.journal = {name: parts[2].replace('Journal: ','')}; } catch (err) {}
      delete rec.description;
    }
    if (rec.user_name) {
      rec.legacy.username = rec.user_name;
      delete rec.user_name;
    }
    if (rec.user_profession) {
      rec.legacy.user_profession = rec.user_profession;
      delete rec.user_profession;
    }
    if (rec.user_email) {
      rec.legacy.user_email = rec.user_email;
      delete rec.user_email;
    }
    if (rec.url) {
      if (rec.url.indexOf('chrome') === -1 && rec.url.indexOf('openaccessbutton') === -1 && rec.url.indexOf('about:') === -1) {
        if ( (rec.user && rec.user.toLowerCase().indexOf('admin') === -1 && rec.user.toLowerCase().indexOf('eardley') === -1) || !rec.user ) {
          records.push(rec);      
        }
      }
    }
  }
  return {total: records.length, records: records, started: recs.length, locations: userlocs};
}

var run = function(save) {
  var blocks = [];
  var locations = {};
  var old = getoldblocked();
  //var urlemails = old.urlemails;
  for ( var i in old.records ) blocks.push(old.records[i]);
  for ( var l in old.locations ) locations[l] = old.locations[l];
  var oldold = getreallyoldblocked();
  for ( var ii in oldold.records ) blocks.push(oldold.records[ii]);
  for ( var ll in oldold.locations ) {
    if (locations[ll] === undefined) locations[ll] = oldold.locations[ll];
  }
  // call live system db for a list of more location data by user
  var livelocs = OAB_Blocked.find({}).fetch();
  for ( var lo in livelocs ) {
    var bl = livelocs[lo];
    if (bl.location && bl.username) {
      var tl = bl.location;
      if (tl.geo) {
        if (tl.geo.lat) {
          if (typeof tl.geo.lat === 'string') tl.geo.lat = parseInt(tl.geo.lat);
        }
        if (tl.geo.lon) {
          if (typeof tl.geo.lon === 'string') tl.geo.lon = parseInt(tl.geo.lon);          
        }
      }
      locations[bl.username] = tl;
    }
  }
  var clean = 0;
  var foundlocs = 0;
  var newblocks = 0;
  for ( var b in blocks ) {
    var block = blocks[b];
    if ( ( block.location === undefined || block.location.geo === undefined || !block.location.geo.lat ) && locations[block.user] !== undefined) {
      block.location = locations[block.user];
      foundlocs += 1;
    }
    if (save) OAB_Blocked.insert(block);    
  }
  // call a function to get the old wishlist records - for each try to make it meet current request format 
  // and match with a urlemail and a current user - if possible, save it as a request
  return {blocks: blocks.length, located: foundlocs, oldstart: old.started, oldtotal: old.total, oldoldstart: oldold.started, oldoldtotal: oldold.total}
}

CLapi.addRoute('scripts/oabutton/importold', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      return run(this.queryParams.save);
    }
  }
});




