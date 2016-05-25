
// content text and data mining

// totext - given somthing, get any text out of it and return it
// regex - given some text, do a regex on it, either from library of known regexes or a provided one (return +- 100 chars)
// match - given some text, match content in it to some dictionary and return matches (return +- 100 chars)
// lookup

// submit a document URL for processing, and metadata such as published date etc whatever is useful for subsequent processing
// contentmine reads in the doc to elasticsearch as an attachment in a processing index
// returns the ID of the document that was created

// do a match find on the processing docs using provided input text strings and/or regexes
// do a lookup find on the processing docs using provided link to dictionary of terms
// return count of matched docs, with +- 100 chars
// can save results into facts index if desired and permitted

// run against one document, or search across many by query? or both?

// when to empty the processing index?
// have a per-day processing index? recreate per day when required, by finding everything published on a given day and reloading if necessary?

contentmine_dicts = new Mongo.Collection("contentmine_dicts"); // dicts to match against
contentmine_urls = new Mongo.Collection("contentmine_urls"); // any URL seen by the system will be saved into an ES index, keep track of it here
contentmine_sets = new Mongo.Collection("contentmine_sets"); // sets of URLs to work on
contentmine_results = new Mongo.Collection("contentmine_results"); // for a URL and a set, the results found in it, and when

CLapi.addRoute('contentmine', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Some useful contentmining tools in development'} };
    }
  }
});

CLapi.addRoute('contentmine/dictionary', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'GET a particular dictionary that has previously been uploaded, to match against'} };
    }
  }
});
CLapi.addRoute('contentmine/dictionary/:dict', {
  get: {
    action: function() {
      // find the named dict and return it
      var d = contentmine_dicts.findOne(this.urlParams.dict);
      if (d) {
        return {status: 'success', data: d };
      } else {
        return { statusCode: 404, body: '404 not found'}
      }
    }
  },
  post: {
    action: function() {
      // find the named dict and update it with the additional content provided - or create it if not exists
      // content should be a json list of objects that contain at least a "match" key
      var d = contentmine_dicts.findOne(this.urlParams.dict);
      if (!d) d = contentmine_dicts.insert({dict:[]});
      d.dict = d.dict.concat(this.request.json);
      contentmine_dicts.update(d._id,{$set:{dict:d.dict}});
      return { status: 'success', data: d}
    }
  },
  put: {
    action: function() {
      // find the named dict and replace it entirely with provided content
      var d = contentmine_dicts.findOne(this.urlParams.dict);
      if (!d) d = contentmine_dicts.insert({dict:[]});
      d.dict = this.request.json;
      contentmine_dicts.update(d._id,{$set:{dict:d.dict}});
      return {status: 'success', data: d };
    }
  },
  delete: {
    action: function() {
      // find the named dict and delete it
      var d = contentmine_dicts.findOne(this.urlParams.dict);
      if (d) {
        contentmine_dicts.remove(d._id);
        return {status: 'success' };
      } else {
        return { statusCode: 404, body: '404 not found'}
      }
    }
  }
});

CLapi.addRoute('contentmine/set', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Manage a particular set of URLs, to match against'} };
    }
  }
});
CLapi.addRoute('contentmine/set/:set', {
  get: {
    action: function() {
      // find the named dict and return it
      var d = contentmine_sets.findOne(this.urlParams.set);
      if (d) {
        return {status: 'success', data: d };
      } else {
        return { statusCode: 404, body: '404 not found'}
      }
    }
  },
  post: {
    action: function() {
      // find the named set and update it with the additional content provided - or create it if not exists
      // content should be a json list of objects that contain at least a "match" key
      var d = contentmine_sets.findOne(this.urlParams.set);
      if (!d) d = contentmine_sets.insert({urls:[]});
      d.urls = d.urls.concat(this.request.json);
      // TODO actually for each URL incoming, should see if we have already retrieved. If not, retrieve it.
      // If cannot be retrieved, do not add to set. Show as error in returned output
      // Also resolve all URLs before processing, to aid in deduplication
      contentmine_sets.update(d._id,{$set:{urls:d.urls}});
      return { status: 'success', data: d}
    }
  },
  put: {
    action: function() {
      // find the named dict and replace it entirely with provided content
      var d = contentmine_sets.findOne(this.urlParams.set);
      if (!d) d = contentmine_sets.insert({urls:[]});
      d.urls = this.request.json;
      // TODO actually for each URL incoming, should see if we have already retrieved. If not, retrieve it.
      // If cannot be retrieved, do not add to set. Show as error in returned output
      // Also resolve all URLs before processing, to aid in deduplication
      contentmine_sets.update(d._id,{$set:{urls:d.urls}});
      return {status: 'success', data: d };
    }
  },
  delete: {
    action: function() {
      // find the named dict and delete it
      var d = contentmine_sets.findOne(this.urlParams.set);
      if (d) {
        contentmine_sets.remove(d._id);
        return {status: 'success' };
      } else {
        return { statusCode: 404, body: '404 not found'}
      }
    }
  }
});


// TODO: a process endpoint
// process a given set or record with a particular processor
// processors could /use a remote API

// TODO: have a facts endpoint
// facts
// facts/query
// facts/receive


