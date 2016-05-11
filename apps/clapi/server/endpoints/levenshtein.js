
// As is great with open source, some nice person already wrote out the algorithm :)
// http://andrew.hedges.name/experiments/levenshtein/levenshtein.js

CLapi.addRoute('levenshtein', {
  get: {
    action: function() {
      if (this.queryParams.a && this.queryParams.b) {
        return CLapi.internals.levenshtein(this.queryParams.a,this.queryParams.b)
      } else {
        return {status: 'success', data:{info:'provide two query params called a and b which should be strings, get back the levenshtein distance'}}
      }
    }
  }
});

CLapi.internals.levenshtein = function(a,b) {
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