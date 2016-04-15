
// this is what was oag
// it finds out the licence relevant to a URL, if it can
academic_licence = new Mongo.Collection("academic_licence");
academic_licence.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});

CLapi.addCollection(academic_licence);

CLapi.addRoute('academic/licence', {
  get: {
    action: function() {
      if (this.queryParams.url) {
        return CLapi.internals.academic.licence(this.queryParams.url);
      } else {
        return {status: 'success', data: 'Find out the licence of a URL'}
      }
    }
  },
  post: {
    action: function() {
      return CLapi.internals.academic.licence(this.request.json.url);
    }
  }
});

CLapi.internals.academic.licence = function(url,resolve) {  
  // internal function to get licences list, depending on when last locally stored
  var getlicences = function() {
    // licences originally derived from http://licenses.opendefinition.org/licenses/groups/all.json
    // and were used in this code https://github.com/CottageLabs/OpenArticleGauge/blob/dev/openarticlegauge/view/lookup.py
    // now in this spreadsheet https://docs.google.com/spreadsheets/d/1yJOpE_YMdDxCKaK0DqWoCJDdq8Ep1b-_J1xYVKGsiYI/edit#gid=0
    // which is public published at https://docs.google.com/spreadsheets/d/1yJOpE_YMdDxCKaK0DqWoCJDdq8Ep1b-_J1xYVKGsiYI/pubhtml
    // but remove the free-to-read type
    var fs = Meteor.npmRequire('fs');
    var licences = [];
    var localcopy = '/home/cloo/licences.json'; // TODO put this in settings config
    var stale = 60 * 60 * 1000; // number of ms (in this case one hour) after which licence list should be considered stale (should prob go in settings config)
    if ( fs.existsSync(localcopy) && ((new Date()) - fs.statSync(localcopy).mtime) < stale) {
      licences = JSON.parse(fs.readFileSync(localcopy));
    } else {
      console.log('Getting licences data from google spreadsheet for academic licence calculator')
      var sid = '1yJOpE_YMdDxCKaK0DqWoCJDdq8Ep1b-_J1xYVKGsiYI';
      var surl = "https://spreadsheets.google.com/feeds/list/" + sid + "/od6/public/values?alt=json";
      var g = Meteor.http.call('GET',surl);
      licences = g.data.feed.entry;
      fs.writeFileSync(localcopy, JSON.stringify(licences));
    }
    return licences;
  }

  if (resolve === undefined) resolve = false; // which way? assume no resolve needed?
  var resolved;
  if (resolve) {
    var tr = CLapi.internals.academic.resolve(url);
    tr.url ? resolved = tr.url : resolved = tr.source;
    console.log('Resolved ' + url + ' to ' + resolved + ' to calculate licence from content');
  }
  if (!resolved) resolved = url;
  var exists = academic_licence.findOne({$or:[{url:url,resolved:resolved}]});
  if (exists) {
    return exists;
  } else {
    // work out the licence and save something about it in academic_licence - including a failed attempt
    var licence = {
      url:url
    }
    if (resolved) licence.resolved = resolved;
    var info = Async.wrap(function(resolved, callback) {
      // yes, there is a meteor call that is sync, but it is not returning here properly for some reason
      Meteor.http.call('GET',resolved, function(err,res) { // this shuold perhaps become a phantomjs render
        if (err) {
          return callback(null,{retrievable:false});
        } else {
          var lic = {licence:'unknown',retrievable:true};
          var licences = getlicences();
          console.log(licences.length + ' strings available for licence checking');
          var text = CLapi.internals.convert.xml2txt(undefined,res.content).toLowerCase().replace(/[^a-z0-9]/g,'');
          for ( var i in licences ) {
            var l = licences[i].gsx$licencetype ? licences[i].gsx$licencetype.$t : undefined;
            var d = licences[i].gsx$matchesondomains ? licences[i].gsx$matchesondomains.$t : undefined;
            var m = licences[i].gsx$matchtext ? licences[i].gsx$matchtext.$t : undefined;
            if ( l !== undefined && d !== undefined && m !== undefined && ( d === '*' || resolved.indexOf(d) !== -1 ) ) {
              // example match, line 39 of spreadsheet, cc by 2.0 statement
              // This is an Open Access article distributed under the terms of the Creative Commons Attribution License (http://creativecommons.org/licenses/by/2.0), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly credited.
              // should match http://europepmc.org/articles/PMC3206455
              // This is an Open Access article distributed under the terms of the Creative Commons Attribution License (<a href="http://creativecommons.org/licenses/by/2.0" ref="reftype=extlink&amp;article-id=2210051&amp;issue-id=73721&amp;journal-id=906&amp;FROM=Article%7CFront%20Matter&amp;TO=External%7CLink%7CURI&amp;rendering-type=normal" target="pmc_ext">http://creativecommons.org/licenses/by/2.0</a>), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited.
              var match = m.toLowerCase().replace(/[^a-z0-9]/g,'');
              var urlmatch = m.indexOf('://') !== -1 ? m.toLowerCase().split('://')[1].split('"')[0].split(' ')[0] : false;
              if ( urlmatch && res.content.indexOf(urlmatch) !== -1 ) {
                lic.licence = l;
                lic.matched = urlmatch;
                lic.matcher = m;
              } else if ( text.indexOf(match) !== -1 ) {
                lic.licence = l;
                lic.matched = match;
                lic.matcher = m;
              }
            }
          }
          return callback(null,lic);
        }
      });
    })(resolved);
    if (info.retrievable) {
      for ( var k in info ) licence[k] = info[k];
      academic_licence.insert(licence);
    } else {
      licence.retrievable = false;
    }
    return licence;
    // TODO for certain URLs could also check APIs that may return licence data...
    // Note Springer used to add fulltext.html to the URL that the DOI dereferences to. Is this (and similar cludges) still necessary?
    // see https://github.com/CottageLabs/OpenArticleGauge/blob/dev/openarticlegauge/plugins/springerlink.py#L63
  }
}


