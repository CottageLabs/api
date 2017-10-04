
// use microsoft

CLapi.addRoute('use/microsoft', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns horrific microsoft things a bit nicer'} };
    }
  }
});

CLapi.addRoute('use/microsoft/academic/evaluate', {
  get: {
    action: function() {
      return CLapi.internals.use.microsoft.academic.evaluate(this.queryParams);
    }
  }
});

CLapi.internals.use.microsoft = {};
CLapi.internals.use.microsoft.academic = {};

// https://docs.microsoft.com/en-gb/azure/cognitive-services/academic-knowledge/queryexpressionsyntax
// https://docs.microsoft.com/en-gb/azure/cognitive-services/academic-knowledge/paperentityattributes
// https://westus.dev.cognitive.microsoft.com/docs/services/56332331778daf02acc0a50b/operations/5951f78363b4fb31286b8ef4/console
// https://portal.azure.com/#resource/subscriptions

CLapi.internals.use.microsoft.academic.evaluate = function(qry,attributes) {
  // things we accept as query params have to be translated into MS query expression terminology
  // we will only do the ones we need to do... for now that is just title :)
  // It does not seem possible to search on the extended metadata such as DOI, 
  // and extended metadata always seems to come back as string, so needs converting back to json
  var expr = '';
  for ( var t in qry ) {
    if (t === 'title') expr = encodeURIComponent("Ti='" + qry[t] + "'");
  }
  if (attributes === undefined) attributes = 'Id,Ti,Y,D,CC,W,AA.AuN,J.JN,E';
  var url = 'https://westus.api.cognitive.microsoft.com/academic/v1.0/evaluate?expr='+expr + '&attributes=' + attributes;
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url, {headers: {'Ocp-Apim-Subscription-Key':Meteor.settings.microsoft.academic.key}});
    if ( res.statusCode === 200 ) {
      for ( var r in res.data.entities) {
        if (res.data.entities[r].E) res.data.entities[r].extended = JSON.parse(res.data.entities[r].E);
        res.data.entities[r].converted = {
          title: res.data.entities[r].Ti,
          journal: (res.data.entities[r].J ? res.data.entities[r].J.JN : undefined),
          author: []
        }
        for ( var a in res.data.entities[r].AA ) res.data.entities[r].converted.author.push({name:res.data.entities[r].AA[a].AuN});
        try {
          res.data.entities[r].converted.url = res.data.entities[r].extended.S[0].U;
        } catch(err) {}
        // TODO could parse more of extended into converted, and change result to just converted if we don't need the original junk
      }
      return { status: 'success', data: res.data}
    } else {
      return { status: 'error', data: res.data}
    }
  } catch(err) {
    return { status: 'error', data: 'error', error: err}
  }

}
