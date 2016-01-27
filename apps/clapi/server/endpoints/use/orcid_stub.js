
// should use orcid

// http://support.orcid.org/knowledgebase/articles/343182

// publicly available to people with orcid account
// I have one, so will enable there and get api key

// can only return stuff that people make publicly available on their account
// I will test to see what sort of stuff can be made public
// affiliation data is the thing of immediate interest

CLapi.addRoute('use/orcid', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the orcid API functionality - stub in progress'} };
    }
  }
});
