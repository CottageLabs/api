
// academic catalogue

// for this to be useful, it needs to be more than just a query endpoint, which could be handled by the elasticsearch endpoint

CLapi.addRoute('academic/catalogue', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'creates an academic catalogue'} };
    }
  }
});

// if IN local, need a local ES and filesystem to store in and query
// if NOT IN local, need to send queries to remote service
// need routes to query the index
// need routes to files stored on disk
        
CLapi.internals.academic.catalogue = {};

CLapi.internals.academic.catalogue.daily = function() {
/*
# get all the lookup lists from academic.daily
# for every record, get the resolved URL and cookie URL if there is one
# visit the cookie URL if necessary then the actual URL, to get the file
# process the file to get the raw text out
# save the processed metadata to the ES index
*/
}

if ( Meteor.settings.cron.cataloguedaily ) {
  SyncedCron.add({
    name: 'academic_catalogue_daily',
    schedule: function(parser) { return parser.text('at 4:00 am'); },
    job: CLapi.internals.academic.catalogue.daily
  });
}





