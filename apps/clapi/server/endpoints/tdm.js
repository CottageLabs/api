
// a set of useful tdm things to do on stuff

CLapi.addRoute('tdm', {
  get: {
    action: function() {
      return {status:'success', data: 'Do useful tdm things, so far includes levenshtein, keywords, and match'}
    }
  }
});

CLapi.addRoute('tdm/levenshtein', {
  get: {
    action: function() {
      if (this.queryParams.a && this.queryParams.b) {
        return CLapi.internals.tdm.levenshtein(this.queryParams.a,this.queryParams.b)
      } else {
        return {status: 'success', data:{info:'provide two query params called a and b which should be strings, get back the levenshtein distance'}}
      }
    }
  }
});

CLapi.addRoute('tdm/keywords', {
  get: {
    action: function() {
      // expect a url or a string of data, and indication if content should be converted from *ml or pdf
      var content;
      if ( this.queryParams.content ) {
        content = this.queryParams.content;
      } else if (this.queryParams.url) {
        // resolve the URL
        if ( false ) { // check if we have seen this url before - if so the content should be in our index
        } else {
          // could just get whatever the URL is and save it as attachment into ES...
          if ( this.queryParams.format === 'text' ) {
            content = Meteor.http.call('GET',this.queryParams.url).content;
          } else if ( this.queryParams.format === 'pdf' ) {
            content = CLapi.internals.convert.file2txt(this.queryParams.url);
          } else {
            content = CLapi.internals.convert.xml2txt(this.queryParams.url);          
          }
          // save the content to the contentmine index. Save as attachment too?
        }
      }
      if (content && content.length > 1) {
        return {status: 'success', data: CLapi.internals.tdm.keywords(content)}
      } else {
        return {status: 'error', data: 'Sorry, could not get keywords from content'}
      }
    }
  }
})

CLapi.addRoute('tdm/match', {
  get: {
    action: function() {
      // TODO: find things in a processing document or set of documents
      if ( this.queryParams.url || this.queryParams.set ) {
        var set;
        if ( this.queryParams.url) {
          CLapi.internals.contentmine.get(this.queryParams.url);
          set = [this.queryParams.url];
        } else {
          var s = contentmine_sets.findOne(this.queryParams.set);
          set = s.urls;
        }
        if (set) {
          for ( var ss in set ) {
            var u = set[ss];
          }
        } else {
          return {statusCode: 404, body: '404 not found'}
        }
      } else {
        return {status: 'success', data: {info: 'Match a URL or contentmine set (of URLs) against a given dictionary'} };
      }
    }
  }
});



CLapi.internals.tdm.levenshtein = function(a,b) {
	function minimator(x, y, z) {
		if (x <= y && x <= z) return x;
		if (y <= x && y <= z) return y;
		return z;
	}

  var cost;
  var m = a.length;
  var n = b.length;

  // make sure a.length >= b.length to use O(min(n,m)) space, whatever that is
  if (m < n) {
    var c = a; a = b; b = c;
    var o = m; m = n; n = o;
  }

  var r = []; r[0] = [];
  for (var c = 0; c < n + 1; ++c) {
    r[0][c] = c;
  }

  for (var i = 1; i < m + 1; ++i) {
    r[i] = []; r[i][0] = i;
    for ( var j = 1; j < n + 1; ++j ) {
      cost = a.charAt( i - 1 ) === b.charAt( j - 1 ) ? 0 : 1;
      r[i][j] = minimator( r[i-1][j] + 1, r[i][j-1] + 1, r[i-1][j-1] + cost );
    }
  }
  
  var dist = r[ r.length - 1 ][ r[ r.length - 1 ].length - 1 ]
	return {status:'success',data:{distance:dist,detail:r}};
}

CLapi.internals.tdm.keywords = function(content,opts) {
  var gramophone = Meteor.npmRequire('gramophone');
  var keywords = gramophone.extract(content, opts);
  return keywords;
}
