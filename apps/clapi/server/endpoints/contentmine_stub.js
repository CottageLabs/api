
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

CLapi.addRoute('contentmine', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'stub - in progress'} };
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
      // TODO: find the named dict and return it
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  },
  post: {
    action: function() {
      // TODO: find the named dict and update it with the additional content provided
      // content should be a text file list or a json list
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  },
  put: {
    action: function() {
      // TODO: find the named dict and replace it entirely with provided content
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  },
  delete: {
    action: function() {
      // TODO: find the named dict and delete it
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  }
});

// TODO: should have a set endpoint too for creating new sets and adding docs to them?
// can a set be defined by a query rather than a specific list?
// how are articles in a set represented? url / doi / etc?

CLapi.addRoute('contentmine/match', {
  get: {
    action: function() {
      // TODO: find things in a processing document or set of documents
      return {status: 'success', data: {info: 'stub - in progress'} };
    }
  }
});

CLapi.addRoute('contentmine/match/:set/:dict', {
  get: {
    action: function() {
      // TODO: find a given processing document set (say for a particular day) and match them against a given dict
      // store the resulting facts in the facts index (overwrite any facts from same set against same dict)
      return {status: 'success', data: {info: 'stub - in progress'} };
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



