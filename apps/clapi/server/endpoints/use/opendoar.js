
// docs: 
// http://opendoar.org/tools/api.html
// http://opendoar.org/tools/api13manual.html
// example: 
// http://opendoar.org/api13.php?fields=rname&kwd=Aberdeen%20University%20Research%20Archive

CLapi.addRoute('use/opendoar', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns responses from the opendoar API'} };
    }
  }
});

CLapi.addRoute('use/opendoar/search', {
  get: {
    action: function() {
      return CLapi.internals.use.opendoar.search(this.queryParams.q,this.queryParams.show,this.queryParams.raw);
    }
  }
});

CLapi.addRoute('use/opendoar/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.opendoar.search(this.urlParams.qry,this.queryParams.show,this.queryParams.raw);
    }
  }
});

CLapi.addRoute('use/opendoar/index', {
  get: {
    //roleRequired: 'root',
    action: function() {
      return CLapi.internals.use.opendoar.index();
    }
  }
});

CLapi.internals.use.opendoar = {};

CLapi.internals.use.opendoar.parse = function(rec) {
  var ret = {_id: rec.$.rID};
  if (rec.rName && rec.rName.length > 0 && rec.rName[0].length > 0) ret.name = rec.rName[0];
  if (rec.rAcronym && rec.rAcronym.length > 0 && rec.rAcronym[0].length > 0) ret.acronym = rec.rAcronym[0];
  if (rec.rUrl && rec.rUrl.length > 0 && rec.rUrl[0].length > 0) ret.url = rec.rUrl[0];
  if (rec.rOaiBaseUrl && rec.rOaiBaseUrl.length > 0 && rec.rOaiBaseUrl[0].length > 0) ret.oai = rec.rOaiBaseUrl[0];
  if (rec.uName && rec.uName.length > 0 && rec.uName[0].length > 0) ret.uname = rec.uName[0];
  if (rec.uAcronym && rec.uAcronym.length > 0 && rec.uAcronym[0].length > 0) ret.uacronym = rec.uAcronym[0];
  if (rec.uUrl && rec.uUrl.length > 0 && rec.uUrl[0].length > 0) ret.uurl = rec.uUrl[0];
  if (rec.oName && rec.oName.length > 0 && rec.oName[0].length > 0) ret.oname = rec.oName[0];
  if (rec.oAcronym && rec.oAcronym.length > 0 && rec.oAcronym[0].length > 0) ret.oacronym = rec.oAcronym[0];
  if (rec.oUrl && rec.oUrl.length > 0 && rec.oUrl[0].length > 0) ret.ourl = rec.oUrl[0];
  if (rec.rPostalAddress && rec.rPostalAddress.length > 0 && rec.rPostalAddress[0].length > 0) ret.address = rec.rPostalAddress[0];
  if (rec.paPhone && rec.paPhone.length > 0 && rec.paPhone[0].length > 0) ret.phone = rec.paPhone[0];
  if (rec.paFax && rec.paFax.length > 0 && rec.paFax[0].length > 0) ret.fax = rec.paFax[0];
  if (rec.rDescription && rec.rDescription.length > 0 && rec.rDescription[0].length > 0) ret.description = rec.rDescription[0];
  if (rec.rRemarks && rec.rRemarks.length > 0 && rec.rRemarks[0].length > 0) ret.remarks = rec.rRemarks[0];
  if (rec.rYearEstablished && rec.rYearEstablished.length > 0 && rec.rYearEstablished[0].length > 0 && parseInt(rec.rYearEstablished[0])) ret.established = rec.rYearEstablished[0];
  if (rec.repositoryType && rec.repositoryType.length > 0 && rec.repositoryType[0].length > 0) ret.type = rec.repositoryType[0];
  if (rec.operationalStatus && rec.operationalStatus.length > 0 && rec.operationalStatus[0].length > 0) ret.operational = rec.operationalStatus[0];
  if (rec.rSoftWareName && rec.rSoftWareName.length > 0 && rec.rSoftWareName[0].length > 0) ret.software = rec.rSoftWareName[0];
  if (rec.rSoftWareVersion && rec.rSoftWareVersion.length > 0 && rec.rSoftWareVersion[0].length > 0) ret.version = rec.rSoftWareVersion[0];
  if (rec.paLatitude && rec.paLongitude) ret.location = {geo:{lat:rec.paLatitude[0],lon:rec.paLongitude[0]}}
  if (rec.country && rec.country.length > 0 && rec.country[0].cCountry) {
    ret.country = rec.country[0].cCountry[0];
    if (rec.country[0].cIsoCode) ret.countryIso = rec.country[0].cIsoCode[0];
  }
  if (rec.classes && rec.classes.length > 0 && rec.classes[0].class) {
    ret.classes = [];
    for ( var c in rec.classes[0].class ) {
      var cl = {};
      if (rec.classes[0].class[c].clCode) cl.code = rec.classes[0].class[c].clCode[0];
      if (rec.classes[0].class[c].clTitle) cl.title = rec.classes[0].class[c].clTitle[0];   
      ret.classes.push(cl);
    }
  }
  if (rec.languages && rec.languages.length > 0 && rec.languages[0].language) {
    ret.languages = [];
    for ( var l in rec.languages[0].language ) {
      var ll = {};
      if (rec.languages[0].language[l].lIsoCode) ll.iso = rec.languages[0].language[l].lIsoCode[0];
      if (rec.languages[0].language[l].lName) ll.name = rec.languages[0].language[l].lName[0];
      ret.languages.push(ll);
    }
  }
  if (rec.contentTypes && rec.contentTypes.length > 0 && rec.contentTypes[0].contentType) {
    ret.contents = [];
    for ( var t in rec.contentTypes[0].contentType ) {
      var co = {};
      if (rec.contentTypes[0].contentType[t]._) co.type = rec.contentTypes[0].contentType[t]._;
      if (rec.contentTypes[0].contentType[t].$ && rec.contentTypes[0].contentType[t].$.ctID) co.id = rec.contentTypes[0].contentType[t].$.ctID;
      ret.contents.push(co);
    }
  }
  if (rec.policies && rec.policies.length > 0 && rec.policies[0].policy) {
    ret.policies = [];
    for ( var p in rec.policies[0].policy ) {
      var po = {};
      if (rec.policies[0].policy[p].policyType && rec.policies[0].policy[p].policyType.length > 0 && rec.policies[0].policy[p].policyType[0]._ ) po.type = rec.policies[0].policy[p].policyType[0]._ 
      if (rec.policies[0].policy[p].policyGrade && rec.policies[0].policy[p].policyGrade.length > 0 && rec.policies[0].policy[p].policyGrade[0]._ ) po.grade = rec.policies[0].policy[p].policyGrade[0]._ 
      if (rec.policies[0].policy[p].poStandard && rec.policies[0].policy[p].poStandard.length > 0 && rec.policies[0].policy[p].poStandard[0].item && rec.policies[0].policy[p].poStandard[0].item.length > 0 ) {
        var std = [];
        for ( var st in rec.policies[0].policy[p].poStandard[0].item ) {
          if ( typeof rec.policies[0].policy[p].poStandard[0].item[st] === "string" ) std.push(rec.policies[0].policy[p].poStandard[0].item[st]);
        }
        po.standard = std; 
      }
      ret.policies.push(po);
    }
  }
  if (rec.contacts && rec.contacts.length > 0 && rec.contacts[0].person) {
    ret.contacts = [];
    for ( var cn in rec.contacts[0].person ) {
      var cont = {};
      if (rec.contacts[0].person[cn].pName && rec.contacts[0].person[cn].pName.length > 0) cont.name = rec.contacts[0].person[cn].pName[0];
      if (rec.contacts[0].person[cn].pJobTitle && rec.contacts[0].person[cn].pJobTitle.length > 0) cont.title = rec.contacts[0].person[cn].pJobTitle[0];
      if (rec.contacts[0].person[cn].pEmail && rec.contacts[0].person[cn].pEmail.length > 0) cont.email = rec.contacts[0].person[cn].pEmail[0];
      if (rec.contacts[0].person[cn].pPhone && rec.contacts[0].person[cn].pPhone.length > 0 && rec.contacts[0].person[cn].pPhone[0].length > 0) cont.phone = rec.contacts[0].person[cn].pPhone[0];
      ret.contacts.push(cont);
    }
  }
  return ret;
}

CLapi.internals.use.opendoar.search = function(qrystr,show,raw) {
  if (show === undefined) show = 'basic';
  var url = 'http://opendoar.org/api13.php?show=' + show + '&kwd=' + qrystr;
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      var js = CLapi.internals.convert.xml2json(undefined,res.content);
      var data = [];
      if (raw) {
        for ( var rr in js.OpenDOAR.repositories[0].repository ) data.push(js.OpenDOAR.repositories[0].repository[rr]);
      } else {
        for ( var r in js.OpenDOAR.repositories[0].repository ) data.push(CLapi.internals.use.opendoar.parse(js.OpenDOAR.repositories[0].repository[r])); 
      }
      return { status: 'success', total: js.OpenDOAR.repositories[0].repository.length, data: data}
    } else {
      return { status: 'error', data: res}
    }
  } catch (err) {
    return { status: 'error', data: err}    
  }
}

CLapi.internals.use.opendoar.download = function(show) {
  if (show === undefined) show = 'max';
  var url = 'http://opendoar.org/api13.php?all=y&show=' + show;
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      var js = CLapi.internals.convert.xml2json(undefined,res.content);
      var data = [];
      for ( var r in js.OpenDOAR.repositories[0].repository ) data.push(CLapi.internals.use.opendoar.parse(js.OpenDOAR.repositories[0].repository[r]));
      console.log('OpenDoar download retrieved ' + js.OpenDOAR.repositories[0].repository.length);
      console.log('OpenDoar download converted ' + data.length);
      return { status: 'success', total: js.OpenDOAR.repositories[0].repository.length, data: data}
    } else {
      return { status: 'error', data: res}
    }
  } catch (err) {
    return { status: 'error', data: err}    
  }
}

CLapi.internals.use.opendoar.index = function() {
  var dl = CLapi.internals.use.opendoar.download();
  var ret = {total:dl.total,success:0,error:0,errors:[]};
  for ( var r in dl.data ) {
    console.log(r)
    var rec = dl.data[r];
    var res = CLapi.internals.es.insert('/opendoar/repository/' + rec._id, rec);
    if (res.info === undefined) {
      ret.success += 1;
    } else {
      console.log('ERROR');
      ret.errors.push(res);
      ret.error += 1;
    }
  }
  return ret;
}




