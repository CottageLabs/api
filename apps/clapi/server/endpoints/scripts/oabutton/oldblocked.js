
// reads the csv of records from the old old system and makes them ready for ingest to the new new system

// old records have these keys:
// 'story', 'doi', 'user_slug', 'description', 'url', 'coords_lng', 'coords_lat', 'location', 'accessed', 'user_name', 
// 'id', 'user_email', 'user_profession']

var fs = Meteor.npmRequire('fs');

var oabinput = '/home/cloo/migrates/oabutton/oabold/oaevent_old_system_blocked.csv';
var oabjsonout = '/home/cloo/migrates/oabutton/oabold/blocked.json';
var oabcsvout = '/home/cloo/migrates/oabutton/oabold/blocked.csv';

var oldblocked = function() {
  fs.writeFileSync(oabcsvout,'"user","user_name","user_email","url","story"\n');
  var inp = fs.readFileSync(oabinput).toString();
  var recs = CLapi.internals.convert.csv2json(undefined,inp);
  console.log(recs.length);
  var records = [];
  for ( var i in recs ) {
    var rec = recs[i];
    rec.type = 'article';
    rec.legacy = {legacy:true};
    if (rec.id !== undefined) delete rec.id;
    if (rec.metadata === undefined) rec.metadata = {};
    if (rec.story === undefined) rec.story = '';
    if (rec.doi) {
      rec.metadata.identifier = [{type:'doi',id:rec.doi}]; 
      delete rec.doi;
    }
    if (rec.doi) {
      rec.email = rec.authoremails;
      delete rec.authoremails;
    }
    if ( rec.user_slug ) {
      rec.user = rec.user_slug;
      delete rec.user_slug;
    }
    if ( rec.accessed ) {
      rec.legacy.created_date = rec.accessed; // decide how to format created date for new system
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
    if ( rec.description ) {
      // this is a string of info pulled from the page about the article. Can it be salvaged? Example:
      // Title: Fractalkine overexpression suppressestau pathology in a mouse model of tauopathy\r\n
      // Authors: Kevin R. Nash, Daniel C. Lee, Jerry B. Hunt, Josh M. Morganti, Maj-Linda Selenica, Peter Moran, Patrick Reid, Milene Brownlow, Clement Guang-Yu Yang, Miloni Savalia, Carmelina Gemma, Paula C. Bickford, Marcia N. Gordon, David Morgan\r\n
      // Journal: Neurobiology of Aging\r\n
      // Date: 2013-6
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
    
    //if ( rec.user_name ) delete rec.user_name; // useful for test cleaning - should not be in data but may be useful for recreating accounts
    //if ( rec.user_profession ) delete rec.user_profession;
    //if ( rec.user_email ) delete rec.user_email;
    // could also do a push from this user/name/email to locations for similar users in more recent data set

    // write into the csv dump - note this needs changed if the lines above are uncommented to remove user data
    var line = '"' + rec.user + '","' + rec.user_name + '","' + rec.user_email + '","' + rec.url.replace('"','') + '","' + rec.story.replace('"','').replace('\n','') + '"\n';
    fs.appendFileSync(oabcsvout,line);

    records.push(rec);
  }
  
  fs.writeFileSync(oabjsonout,JSON.stringify(records,"","  "));

  return {records: records.length};
}


CLapi.addRoute('scripts/oabutton/oldblocked', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      if (this.queryParams.csv) {
        if (this.queryParams.refresh === undefined) oldblocked();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/csv'
          },
          body: fs.readFileSync(oabcsvout)
        }
      } else if (this.queryParams.json) {
        if (this.queryParams.refresh === undefined) oldblocked();
        return JSON.parse(fs.readFileSync(oabjsonout));
      } else {
        return {status: 'success', data: oldblocked()};      
      }
    }
  }
});