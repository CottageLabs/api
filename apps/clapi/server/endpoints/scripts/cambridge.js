
// cambridge daily processing

// get the daily list from the CL API
// http://dev.api.cottagelabs.com/academic/daily/2016-04-14 (or whatever the date is)
// in data there is a list of results
// if they don't already have the resolved url and possibly a cookie url, get them from the CL resolve API

// for each in the list, get the cookie from the cookie url if necessary
//var res = Meteor.http.call('GET',possibles.cookie);
//if (res.headers['set-cookie']) cookie = res.headers['set-cookie'].join( "; " );

// then get the content file url using the cookie in the header of the get request
//headers: {'Set-Cookie': cookie}

// save the content file to disk somewhere

// extract all the text from it
//var html2txt = require('html-to-text');
//var text = html2txt.fromString(content, {wordwrap: 130});

// or if it is not html, use textract?
//var textract = Meteor.npmRequire('textract');
//textract.fromUrl(url, function( err, result ) {
//  return callback(null,result);
//});

// remove generic words? extract keywords? anything else of use?
// note that full text will be needed if later trying to match it back onto the doc for annotator
// insert it all into the cambridge ES

// once all new files are retrieved, search the indexes for the lookup lists
// for each lookup list / mining process
// issue a query to the index looking for facts in the new records

// if the list has changed since last run, then run the new parts against all content

// save the discovered facts in the cambridge index

