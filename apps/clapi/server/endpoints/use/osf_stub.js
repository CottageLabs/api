
// an OSF API client

// mostly exists sot that oabutton can deposit data to them
// would need an ODB user account and a node to stick files onto

// it may be possible we get an email address to send stuff to OSF as an email. 
// If so, just make that the deposit function, direct on OAB, instead of this use stub.
// Because it will only be relevant for OAB content anyway, and the OSF API does not provide anything 
// else of use for any of our current requirements on OAB or other projects.

// https://api.osf.io/v2/docs/#!/v2/File_Detail_GET


CLapi.addRoute('use/osf', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the OSF API functionality. Stub in progress.'} };
    }
  }
});

CLapi.internals.use.osf = {};

CLapi.internals.use.osf.deposit = function(doi) {

};

