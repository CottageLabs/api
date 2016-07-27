
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

CLapi.internals.academic.licence = function(url,resolve,content,start,end,refresh) {
  // internal function to get licences list, depending on when last locally stored
  var getlicences = function() {
    // licences originally derived from http://licenses.opendefinition.org/licenses/groups/all.json
    // and were used in this code https://github.com/CottageLabs/OpenArticleGauge/blob/dev/openarticlegauge/view/lookup.py
    // now in this spreadsheet https://docs.google.com/spreadsheets/d/1yJOpE_YMdDxCKaK0DqWoCJDdq8Ep1b-_J1xYVKGsiYI/edit#gid=0
    // which is public published at https://docs.google.com/spreadsheets/d/1yJOpE_YMdDxCKaK0DqWoCJDdq8Ep1b-_J1xYVKGsiYI/pubhtml
    // but remove the free-to-read type
    var fs = Meteor.npmRequire('fs');
    var licences = [];
    var localcopy = Meteor.settings.academic.licence.licencesfile;
    var stale = Meteor.settings.academic.licence.stale;
    if ( fs.existsSync(localcopy) && ( ( (new Date()) - fs.statSync(localcopy).mtime) < stale || !Meteor.settings.academic.licence.remote) ) {
      console.log('licences data retrieved from local copy ' + localcopy);
      licences = JSON.parse(fs.readFileSync(localcopy));
    } else if ( Meteor.settings.academic.licence.remote ) {
      console.log('Getting licences data from google spreadsheet for academic licence calculator')
      var surl = Meteor.settings.academic.licence.remote;
      var g = Meteor.http.call('GET',surl);
      licences = g.data.feed.entry;
      // TODO re-order the incoming licences to be longest matchtext first
      var slt = {};
      for ( var l in licences ) {
        var mt = licences[l].gsx$matchtext;
        var mtl = mt ? mt.length : 0;
        if (slt[mtl] === undefined) slt[mtl] = [];
        slt[mtl].push(l);
      }
      var keys = [];
      for ( var s in slt ) keys.push(s);
      keys.sort(function(a,b) {return b-a;});
      var lics = [];
      for ( var k in keys ) {
        var kk = keys[k];
        for (var ob in slt[kk]) {
          lics.push(licences[slt[kk][ob]]);
        }
      }
      fs.writeFileSync(localcopy, JSON.stringify(lics));
    }
    return licences;
  }
  
  // internal function to find licences in content string
  var findlicences = function(content,source) {
    console.log('Academic licence doing find licences on content of length ' + content.length);
    var lic = {licence:'unknown',retrievable:true};
    var licences = getlicences();
    console.log(licences.length + ' strings available for licence checking');
    if (start !== undefined) {
      var parts = content.split(start);
      parts[1] !== undefined ? content = parts[1] : content = parts[0];
    }
    if (end !== undefined) content = content.split(end)[0];
    console.log('Academic licence reduced content length to ' + content.length);
    if (content.length > 1000000) {
      console.log('content for licence check was long, so reduced to 500000 chars from start and end');
      lic.large = true;
      content = content.substring(0,500000) + content.substring(content.length-500000,content.length);
    }
    
    var text;
    try {
      text = CLapi.internals.convert.xml2txt(undefined,content).toLowerCase().replace(/[^a-z0-9]/g,'');
    } catch(err) {}
    if (text) {
      for ( var i in licences ) {
        var l = licences[i].gsx$licencetype ? licences[i].gsx$licencetype.$t : undefined;
        var d = licences[i].gsx$matchesondomains ? licences[i].gsx$matchesondomains.$t : undefined;
        var m = licences[i].gsx$matchtext ? licences[i].gsx$matchtext.$t : undefined;

        if ( l !== undefined && d !== undefined && m !== undefined &&
          ( d === '*'
          || (source && d.toLowerCase().indexOf(source.toLowerCase().replace('http://','').replace('https://','').replace('www.','').split('/')[0]) !== -1)
          || source === undefined )
        ) {
          // example match, line 39 of spreadsheet, cc by 2.0 statement
          // This is an Open Access article distributed under the terms of the Creative Commons Attribution License (http://creativecommons.org/licenses/by/2.0), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly credited.
          // should match http://europepmc.org/articles/PMC3206455
          // This is an Open Access article distributed under the terms of the Creative Commons Attribution License (<a href="http://creativecommons.org/licenses/by/2.0" ref="reftype=extlink&amp;article-id=2210051&amp;issue-id=73721&amp;journal-id=906&amp;FROM=Article%7CFront%20Matter&amp;TO=External%7CLink%7CURI&amp;rendering-type=normal" target="pmc_ext">http://creativecommons.org/licenses/by/2.0</a>), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited.
          var match = m.toLowerCase().replace(/[^a-z0-9]/g, '');
          var urlmatch = m.indexOf('://') !== -1 ? m.toLowerCase().split('://')[1].split('"')[0].split(' ')[0] : false;
          if (urlmatch && content.toLowerCase().indexOf(urlmatch) !== -1) {
            console.log('academic licence matched on url ' + urlmatch);
            lic.licence = l;
            lic.matched = urlmatch;
            lic.matcher = m;
            break;
          } else if (text.indexOf(match) !== -1) {
            console.log('academic licence matched on text ' + match);
            lic.licence = l;
            lic.matched = match;
            lic.matcher = m;
            break;
          }
        }
      }
    }
    return lic;
  }

  // somehow some URLs seemed to come in with whitespace at the start of them. So remove it
  if (url) url = url.replace(/(^\s*)|(\s*$)/g,'');
  if (resolve === undefined) resolve = false; // which way? assume no resolve needed?
  var resolved;
  if (resolve && url) {
    var tr = CLapi.internals.academic.resolve(url);
    tr.url ? resolved = tr.url : resolved = tr.source;
    console.log('Resolved ' + url + ' to ' + resolved + ' to calculate licence from content');
  }
  if (!resolved) resolved = url;

  var exists = academic_licence.findOne({$or:[{url:url,resolved:resolved}]});
  if (exists && !refresh) {
    return exists;
  } else if (content) {
    return findlicences(content,resolved); // never saves, just processes
  } else {
    // work out the licence and save something about it in academic_licence - including a failed attempt
    var licence = {
      url:url
    }
    licence.resolved = resolved;    
    console.log('Getting ' + url + ' which resolved to ' + resolved + ' for licence check');
    var info = Async.wrap(function(resolved, callback) {
      // yes, there is a meteor call that is sync, but it is not returning here properly for some reason
      Meteor.http.call('GET',resolved, function(err,res) { // this shuold perhaps become a phantomjs render
        if (err) {
          console.log('Error while fetching ' + resolved + ' for academic licence check.');
          return callback(null,{retrievable:false});
        } else {
          var lic = findlicences(res.content,resolved);
          return callback(null,lic);
        }
      });
    })(resolved);
    if (info.retrievable) {
      for ( var k in info ) licence[k] = info[k];
      if (exists && refresh) {
        academic_licence.update(exists._id,{$set:licence});
      } else {
        academic_licence.insert(licence);
      }
    } else {
      licence.retrievable = false;
    }
    return licence;
    // TODO for certain URLs could also check APIs that may return licence data...
    // Note Springer used to add fulltext.html to the URL that the DOI dereferences to. Is this (and similar cludges) still necessary?
    // see https://github.com/CottageLabs/OpenArticleGauge/blob/dev/openarticlegauge/plugins/springerlink.py#L63
  }
}


