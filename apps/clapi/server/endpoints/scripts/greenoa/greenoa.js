/*

Took 80 mins to do first 6 issn, which had 2043 doi. number 7 appears not to return anything from sherpa. number 8 returns nothing from crossref
9 and 10 had 1073 DOIs between them, with only about 100 for 9 and the rest for 10. Took 40 mins to run the last 4.
So in 2 hours processes 10 issn and about 3100 doi. at that average we can expect about 800000 doi. 
Managing about 25 doi per minute then, or 1 every 2s.
1.6m seconds is 18.5 days to do the lot...

Produce a list of Green OA articles from journals from a given list of ISSNs, which have not already been deposited in a digital repository, 
along with affiliation data for the authors of those papers.

In order to do this we will:

1. Take a seed list of ISSNs, which may need to be extracted from a PDF document

ISSN list from: https://www.elsevier.com/__data/assets/pdf_file/0005/78476/external-embargo-list.pdf
Retrieved on 14/01/2016
Extracted the text, grepped out header lines, then title lines, then lines without -, then manual scan showed 
one spurious line having -soignante in it, removed it, leaving:
2644 ISSNs



2. Query against CrossRef for all articles published under those ISSNs within the last X years (X=2, but can be varied on request)

We appear to need to know how many articles in total are published in these journals over the last two years, but only those with 
Green, Blue, or Yellow policies in Sherpa are actually going to be used. So do 3 before 2, then get the article metadata.



3. Check the self-archiving policies of the the journal in Sherpa Romeo, and carry forward all articles which are from either Green, 
Blue or Yellow publications (recording which along the way)

Filter the list of ISSNs by comparison against Sherpa Romeo, and reduce the list down to just those that have Green, Blue, or Yellow 
policies, and store which policies they have.

Then go to crossref for the full list of articles in these suitable ISSNs and get their full metdata, which includes DOIs.
All elsevier-published journal articles, of which this set of ISSNs are, have a DOI. So doing by other ID will not yield more.



4. Check suitable open access repositories for copies of the article by searching for key identifiers (in particular DOI) in locations 
such as: CORE (and any other sources recommended by Jisc), and carry forward any articles that do not appear.

For each article in the list, using DOI (see above for why only DOI) we can hit CORE and EUPMC.
Could also hit Dissemin (crossref, base, sherpa/romeo, zotero, arxiv, hal, pmc, openaire, doaj, perse, cairn.info, numdam)

If we can't get a resolved open URL, drop the article from the list. How big is the list now?



5. Check a range of bibliographic sources for author affiliation information for any/all of the authors; sources include CrossRef, 
EPMC, and any free publisher feeds from Web of Science or Scopus (and any other sources recommended by Jisc)

What we have now is a list of articles that are not available anywhere else we looked. We already have their metadata.
Look for useful affiliation info in the metadata.



6. Consider the possibility of attempting to page-scrape affiliations out of publisher web pages if (5) does not yield sufficient results.

The three choices are:
* resolve ORCIDs where available, but unknown how many authors have them or how many choose to expose affiliation data.
* try journal-scraping for every DOI (but have to write scraper for all of them). Could compile a list of all the URLs and see how many scrapers we need
* use cambridge contentmine to get fulltext of everything that cambridge has subscription to, get xml, and textmine the affiliations out of it



Given the variable nature of the data in each of the sources we look at, Cottage Labs cannot - at this end of the project - comment on how 
accurate or complete the results will be. We propose to put the total number of days in this estimate into taking the work forward as far 
as is possible, and to generate a list at the end with as much information as was available, and with any suggestions as to how this could 
be enhanced on in future work, if such options are available.

*/

var fs = Meteor.npmRequire('fs');

var issninfile = '/home/cloo/dev/api/apps/clapi/server/endpoints/scripts/greenoa/issns.txt';

var resultpath = '/home/cloo/dev/api/apps/clapi/server/endpoints/scripts/greenoa/results/';
var lastrunfilename = 'lastrun.txt';
var resultfilename = 'results.csv';
var badcoloursfilename = 'badcolours.csv';
var resolvedfilename = 'resolved.csv';
var errorsfilename = 'errors.csv';

var counts = function() {
  var publishedsince = '2014-01-01'; // for crossref query
  
  var counters = {issns:0, dois:0, bad:0, results:0, resolved:0, affiliations:0}

  var now = new Date();
  var when = now.getFullYear().toString();
  var mth = (now.getMonth()+1).toString();
  if (mth.length === 1) when += '0';
  when += mth + now.getDate().toString() + now.getHours().toString() + now.getMinutes().toString();
  var lastrunfile = resultpath + lastrunfilename;
  fs.writeFileSync(lastrunfile,when);
  // wanted to have directories per when date, but fs.mkdirSync causes unexpected error no matter what way I try it
  var resultfile = resultpath + resultfilename;
  var badcoloursfile = resultpath + badcoloursfilename;
  var resolvedfile = resultpath + resolvedfilename;
  var errorsfile = resultpath + errorsfilename;
  fs.writeFileSync(resultfile,'"ISSN","COLOUR","DOI","AFFILIATIONS"\n');
  fs.writeFileSync(badcoloursfile,'"ISSN","COLOUR"\n');
  fs.writeFileSync(resolvedfile,'"ISSN","COLOUR","DOI","URL","FOUND"\n');    
  fs.writeFileSync(errorsfile,'"ISSN","DOI"\n');    
  console.log(when);
    
  var issns = fs.readFileSync(issninfile).toString().split("\n");
  var allissns = issns.length;
  console.log(allissns);
  for ( var iss in issns ) {
    counters.issns += 1;
    var issn = issns[iss];
    console.log(issn + ' ' + counters.issns + ' of ' + allissns);
    
    // check if green, blue, or yellow in sherpa/romeo
    var colour;
    try {
      colour = CLapi.internals.use.sherpa.romeo.colour(issn).data;
      try {
        var test = colour.toLowerCase();
      } catch(err) { colour = undefined; }
    } catch(err) {}
    console.log(colour);
    
    // if so keep processing it
    if ( colour !== undefined ) {
      if ( colour.toLowerCase() === 'yellow' || colour.toLowerCase() === 'green' || colour.toLowerCase() === 'blue' ) {
      
        var from = 0;
        var size = 1000;
        var total = 0;
        var itotal = 0;
        var res;
        try {
          res = CLapi.internals.use.crossref.works.search(undefined,from,size,'from-pub-date:' + publishedsince + ',issn:' + issn);
          try { total = res.data['total-results']; } catch (err) {}
        } catch(err) {}
        console.log(total);
        
        while ( from < total ) {
          // process current results
          for ( var r in res.data.items ) {
            // for all the articles we have for each suitable journal, look them up via DOI in CORE and EUPMC and Dissemin
            // if resolvable, discard
            counters.dois += 1;
            itotal += 1;
            var rec = {};
            rec.crossref = res.data.items[r];
            var doi;
            try {
              doi = rec.crossref.DOI;
            } catch(err) { doi = 'unknown'; }
            try {
              console.log(doi + ' ' + counters.dois + ' ' + itotal + ' of ' + total + ' for ' + issn + ' ' + counters.issns + ' of ' + allissns);
              var resolved = false;
              try {
              // check core for full text
                rec.core = CLapi.internals.use.core.articles.doi(doi).data;
                resolved = rec.core.data.fulltextIdentifier;
                if (resolved) rec.found = 'core';
              } catch(err) {}
              if (!resolved) {
                try {
                  // check eupmc for full text
                  // would being in eupmc count? or only looking for self-archived? TODO: ASK NEIL
                  rec.europepmc = CLapi.internals.use.europepmc.doi(doi).data;
                  try {
                    for ( var ln in rec.europepmc.fullTextUrlList.fullTextUrl ) {
                      var lnk = rec.europepmc.fullTextUrlList.fullTextUrl[ln];
                      if ( lnk.availabilityCode === 'OA' ) resolved = lnk.url; // could end up being pdf or html, or other. But still resolved
                    }
                  } catch(err) {}
                  if (resolved) rec.found = 'europepmc';
                } catch(err) {}
              }
              if (!resolved) {
                // check dissemin for any link to fulltext
                try {
                  rec.dissemin = CLapi.internals.use.dissemin.doi(doi);
                  resolved = rec.data.pdf_url;
                  if (resolved) rec.found = 'dissemin';
                } catch(err) {}
              }

              if (!resolved) {
                // if not resolvable, do we have good author affiliation metadata?
                // if it was not found we will already have all crossref, core and eupmc metadata to look for affiliations in

                // eupmc contains author IDs - ORCIDs - where known.
                // see eupmc result here with oricds: http://api.cottagelabs.com/use/europepmc/doi/10.1186/1471-2458-6-309
                // Can orcid API return affiliations? Depends what the author makes publicly available

                // if affiliations still not known, is it worth calling quickscrape on the journal page?
                // could look at a few of the landing pages that are evident, and see if they are generic
                // if not, writing scrapers for c2.5k journals will take a looooong time
                // perhaps one scraper per hour, including testing and checking
                // 2500 hours = 357 working days! Even doing them quick, max 1 every 10 mins, with possible dups, estimate at least 50 days...
                // but is straightforward although repetitive work - if someone could be found to do it for £100 / day, that is £5k - £10k
                // and 2 to 6 months work. So if Jisc really want it, it can be done...

                var affiliations = '';
                // look for crossref affiliations
                try {
                  var craffs = 'CR';
                  for ( var cr in rec.crossref.author ) {
                    if (rec.crossref.author[cr].affiliation.length) {
                      if ( craffs !== 'CR' ) craffs += '___';
                      craffs += JSON.stringify(rec.crossref.author[cr],undefined,0).replace(/\"/g,"'");
                    }
                  }
                  if ( craffs !== 'CR' ) {
                    affiliations += craffs + 'CR';
                    counters.affiliations += 1;
                  }
                } catch(err) { console.log('ERROR PROCESSING CROSSREF AFFILIATIONS'); }

                // core appears to have no affiliation data - although contributor could be author affiliations
                // in europepmc when returning Dublin Core (which we don't) they use contributor as author affiliation data
                // but then there is no way to map author to affiliation. Does this matter?

                // look for europepmc affiliations
                // eupmc returns an "affiliation" key but that seems to be all. This is prob the affiliation of some author, but don't know which
                //try {
                  //var euaffs = 'EUPMC';
                  //for ( var eu in rec.europepmc.authorIdList.authorId ) {
                  //  if (rec.europepmc.authorIdList.authorId[eu].type === 'ORCID') {
                  //    if ( euaffs !== 'EUPMC' ) euaffs += '___';
                  //  }
                  //}
                  //if ( euaffs !== 'EUPMC' ) {
                  //  affiliations += euaffs + 'EUPMC';
                  //  counters.affiliations += 1;
                  //}
                //} catch(err) { console.log('ERROR PROCESSING EUPMC AFFILIATIONS'); }
                
                // dissemin has data.authors which can have affiliation and orcid - but same problem, and probably same sources as above

                fs.appendFileSync(resultfile,'"' + issn + '","' + colour + '","' + doi + '","' + affiliations + '"\n');
                counters.results += 1;

              } else {
                // write record to foundrecords results file?
                fs.appendFileSync(resolvedfile,'"' + issn + '","' + colour + '","' + doi + '","' + resolved + '","' + rec.found + '"\n');
                counters.resolved += 1;
              }
            } catch(err) {
              counters.errors += 1;
              fs.appendFileSync(errorsfile,'"' + issn + '","' + doi + '"\n');
            }
          }
          
          // go on to next batch
          from += size;
          try {
            res = CLapi.internals.use.crossref.works.search(undefined,from,size,'from-pub-date:' + publishedsince + ',issn:' + issn);
          } catch(err) {}
        }
      } else {
        // write issn to badcolours results file
        fs.appendFileSync(badcoloursfile,'"' + issn + '","' + colour + '"\n');
        counters.bad += 1;        
      }
    } else {
      // write issn to badcolours results file
      fs.appendFileSync(badcoloursfile,'"' + issn + '","unknown"\n');
      counters.bad += 1;
    }

  }
    
  // email me when done with counters
  CLapi.internals.sendmail({to: 'mark@cottagelabs.com', subject: 'greenoa', text: 'finished ' + when + ' with ' + JSON.stringify(counters,undefined,2)});

  return counters;
}

CLapi.addRoute('scripts/greenoa/run', {
  get: {
    authRequired: true,
    roleRequired: 'root',
    action: function() {
      return counts(); // this would not actually return, it will timeout...
    }
  }
});

CLapi.addRoute('scripts/greenoa/results', {
  get: {
    action: function() {
      try {
        var resultfile = resultpath + resultfilename;
        return JSON.parse(fs.readFileSync(resultfile));
      } catch(err) {
        return { status: 'NOT READY'}
      }
    }
  }
});

CLapi.addRoute('scripts/greenoa/results/badcolours', {
  get: {
    action: function() {
      try {
        var badcoloursfile = resultpath + badcoloursfilename;
        return JSON.parse(fs.readFileSync(badcoloursfile));
      } catch(err) {
        return { status: 'NOT READY'}
      }
    }
  }
});

CLapi.addRoute('scripts/greenoa/results/resolved', {
  get: {
    action: function() {
      try {
        var resolvedfile = resultpath + resolvedfilename;
        return JSON.parse(fs.readFileSync(resolvedfile));
      } catch(err) {
        return { status: 'NOT READY'}
      }
    }
  }
});

