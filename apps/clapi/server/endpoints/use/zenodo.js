
// a zenodo API client

// http://zenodo.org/dev
// https://zenodo.org/api/deposit/depositions
// api key required: http://zenodo.org/dev#restapi-auth
// requires a token be provided as query param on all requests, called ?access_token=

CLapi.addRoute('use/zenodo', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'returns a subset of the zenodo API functionality'} };
    }
  }
});

// token set in openaccessbutton section of settings, as this zenodo use endopint is being created for oabutton first
// Meteor.settings.openaccessbutton.zenodo_token
// there is a CL zenodo account, and an access token could be created for it too, as a default, but no need yet so not done
// so expect anything using this endpoint to provide a token (or could use cl default one when it has been added)

// access token would require deposit:write and deposit:actions permission in order to deposit something AND then publish it

// need to POST to create a deposition
// then POST to upload files to the deposition
// then POST to publish the deposition

CLapi.internals.use.zenodo = {};
CLapi.internals.use.zenodo.deposition = {};

// oabutton also wants to be able to search zenodo for papers (unless SHARE covers it)
// https://github.com/OAButton/backend/issues/110
// but zenodo does not have a search API yet - due in the autumn
// see https://zenodo.org/features

CLapi.internals.use.zenodo.deposition.create = function(metadata,up,token) {
  // necessary metadata is title and description and a creators list with at least one object containing name in format Surname, name(s)
  // useful metadata is access_right, license, doi
  // https://zenodo.org/dev#restapi-rep-meta
  if (token === undefined && Meteor.settings.zenodo && Meteor.settings.zenodo.token) token = Meteor.settings.zenodo.token;
  if (token === undefined || metadata === undefined || metadata.title === undefined || metadata.description === undefined) return false;
  var url = 'https://zenodo.org/api/deposit/depositions' + '?access_token=' + token;
  var data = {metadata: metadata}
  if (!data.metadata.upload_type) {
    data.metadata.upload_type = 'publication';    
    data.metadata.publication_type = 'article';
  }
  // required field, will blank list work? If not, need object with name: Surname, name(s) and optional affiliation and creator
  if (!data.metadata.creators) data.metadata.creators = [{name:"Open Access Button"}];
  //try {
    if (up !== undefined) {
      var c = Meteor.http.call('POST',url,{data:data,headers:{'Content-Type':'application/json'}});
      CLapi.internals.use.zenodo.deposition.upload(c.data.id,up.content,up.file,up.name,up.url,token);
      if (up.publish) CLapi.internals.use.zenodo.deposition.publish(c.data.id,token);
      return c.data;
    } else {
      // returns a zenodo deposition resource, which most usefull has an .id parameter (to use to then upload files to)
      console.log('Creating in zenodo');
      return Meteor.http.call('POST',url,{data:data,headers:{'Content-Type':'application/json'}}).data;
    }
  /*} catch(err) {
    console.log('Error creating in zenodo');
    return {status: 'error', data: err}
  }*/
}

CLapi.internals.use.zenodo.deposition.upload = function(id,content,file,name,url,token) {
  if (token === undefined && Meteor.settings.zenodo && Meteor.settings.zenodo.token) token = Meteor.settings.zenodo.token;
  if (token === undefined || id === undefined) return false;
  var uploadurl = 'https://zenodo.org/api/deposit/depositions/' + id + '/files' + '?access_token=' + token;
  try {
    // returns back a deposition file, which has an id. Presumably from this we can calculate the URL of the file
    // TODO for now we are only expecting content from the file attribute, but 
    // how to get it if given content directly or url? need to pass that instead
    console.log('Uploading ' + file + ' name ' + name + ' to zenodo at ' + uploadurl);
    var fs = Meteor.npmRequire('fs');
    var p = Meteor.http.call('POST',uploadurl,{npmRequestOptions:{body:null,formData:{file:fs.createReadStream(file),name:name}},headers:{'Content-Type':'multipart/form-data'}});
    return p.data;
  } catch(err) {
    console.log('Error uploading to zenodo');
    return {status: 'error', data:err}
  }
}

CLapi.internals.use.zenodo.deposition.publish = function(id,token) {
  // NOTE published things cannot be deteted
  if (token === undefined && Meteor.settings.zenodo && Meteor.settings.zenodo.token) token = Meteor.settings.zenodo.token;
  if (token === undefined || id === undefined) return false;
  var url = 'https://zenodo.org/api/deposit/depositions/' + id + '/actions/publish' + '?access_token=' + token;
  try {
    return Meteor.http.call('POST',url).data; // returns the deposition resource again
  } catch(err) {
    console.log('Error publishing in zenodo');
    return {status: 'error', data: err}
  }
}

CLapi.internals.use.zenodo.deposition.delete = function(id,token) {
  if (token === undefined && Meteor.settings.zenodo && Meteor.settings.zenodo.token) token = Meteor.settings.zenodo.token;
  if (token === undefined || id === undefined) return false;
  var url = 'https://zenodo.org/api/deposit/depositions/' + id + '?access_token=' + token;
  try {
    console.log('Deleting in zenodo');
    Meteor.http.call('DELETE',url);
    return {}
  } catch(err) {
    console.log('Error deleting in zenodo');
    return {status: 'error', data: err}
  }
}
