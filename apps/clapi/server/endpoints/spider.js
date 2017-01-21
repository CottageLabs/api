CLapi.addRoute('spider', {
  get: {
    action: function() {
      if (this.queryParams.url) {
        return CLapi.internals.crawl(this.queryParams.url);
      } else {
        return {status:'success',data:'spider a website'}
      }
    }
  }  
});

CLapi.internals.spider = function(url,delay,filter,phantom) {
  // TODO should this use jobs or just do in one long process...
  if (phantom === undefined) phantom = true; // whether or not to get and render pages with phantom - TODO rewrite without phantom if necessary
  if (delay === undefined) delay = 500; // default delay in ms (there is time spent getting and rendering with phantom too)
  var homepage = CLapi.internals.phantom.get(url);
  var cheerio = Meteor.npmRequire('cheerio');
  var relatives = [];
  var $ = cheerio.load(homepage);
  $("a").each(function() {
    var href = $(this).attr('href');
    // grab relative URLs that start with / but not // OR absolute URLs that appear to be on the same site
    // what about subdomains? spider into them too?
    // and what about relative URLs that have no leading slash? It's bad but possible...
    // and is it worth actually doing something with absolute URLs to remote sites?
    // maybe we want to map everything a given site links out to... and what that site links out to... and so on...
    if ( ( href.indexOf('/') === 0 && href.indexOf('//') !== 0 ) || href.replace('http://','').replace('https://','').replace('//','').indexOf(url.replace('http://','').replace('https://','')) === 0 ) {
      relatives.push(href);
    }
  });
  // filter out certain URLs based on the filter list that is passed in - e.g. don't get any url with .pdf in it
  // what to do with each page of results we retrieve? what is actually to be done with each?
  // prob need to pass a callback to do something with each page, and recurse the above, too
  // e.g. the exemplar case for this of spidering an institutional repo would look for metadata 
  // and fulltext links on every page and... save them to an index?
  return {};
};





