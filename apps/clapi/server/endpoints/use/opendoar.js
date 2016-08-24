
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

CLapi.addRoute('use/opendoar/search/:qry', {
  get: {
    action: function() {
      return CLapi.internals.use.opendoar.search(this.urlParams.qry);
    }
  }
});

CLapi.internals.use.opendoar = {};

CLapi.internals.use.opendoar.search = function(qrystr) {
  var url = 'http://opendoar.org/api13.php?kwd=' + qrystr;
  console.log(url);
  try {
    var res = Meteor.http.call('GET', url);
    if ( res.statusCode === 200 ) {
      var js = CLapi.internals.convert.xml2json(undefined,res.content);
      var data = [];
      for ( var r in js.OpenDOAR.repositories ) {
        var rc = js.OpenDOAR.repositories[r].repository[0];
        var rcc = {};
        rcc.rid = rc.$.rID;
        for ( var k in rc ) {
          if (k !== '$') {
            if ( rc[k].length === 1) {
              rcc[k] = rc[k][0];
            } else {
              rcc[k] = rc[k];              
            }
          }
        }
        data.push(rcc);        
      }
      return { status: 'success', total: js.OpenDOAR.repositories.length, data: data}
    } else {
      return { status: 'error', data: res}
    }
  } catch (err) {
    return { status: 'error', data: err}    
  }
}
