
// the API docs are served directly from public/docs/api/index.html
// the routes to it are handled by nginx

// This API should follow the 12 factor approach. Anything that it does that needs to be separated out should run as 
// a separate app, then this API just calls it. The control of the API to call those apps should then be handled by 
// nginx configuration on a gateway - so the API knows where the app is via the gateway, and sends requests to it. 
// Apps exposed this way should only be exposed via this API - not to the web directly (or else there is little point).
// Although some apps may have their own separate direct routes for certain functionality if necessary.

// It should only be necessary to run one API server. If more are required though, just start more. Use nginx upstream 
// groups to control which machines API calls go to. The different API endpoints could be sharded into separate upstream 
// groups so more or less machines in varying clusters can handle the loads of different API endpoints. Where API endpoints 
// herein actually point to other apps that are running on the infrastructure, the same approach should be used - any API 
// server should know to forward requests via the nginx gateway, which forwards them to the upstream group of machines 
// designated as running those apps (or the apps are guaranteed to be running on every localhost of the API server accepting 
// calls to that particular endpoint).

// there are roles and groups. Roles go in groups.
// There are also global roles. Membership of a global role works across all other groups, even if not specified.

// consider there is a user called mark, and a group called cottagelabs and a role called cottager
// mark can be added to the cottagelabs.cottager role

// To be added to roles within the group, Mark must have the cottagelabs.auth role, or be added by someone who has that role

// cascading roles can also be used, so that anyone with a role "above" the necessary role can do the action as well

// so to begin with there is no cottagelabs.auth role, so the first ever user must create it, or make the edits directly

// the first user must therefore be the root user, and have permissions to do anything

// Every group should have a public role, that anyone can join. The amount of permissions this confers can be controlled by 
// the apps that check for public role membership

// if a group has no public role, then nobody can sign up to that group - joining is controlled only by authorised users, in that case

// group controllers can create roles of any name within their group, but only those pre-existing ones in the cascading group 
// can have any sort of cascade functionality

// any new service should have a group created for it - how to restrict group creation? is group API needed sooner? If so, do group config

// TODO custom groups could be made, where a list of cascades and other features are stored for the group in question
// then the auth function could look up the group and read its configuration. That is beyond current scope though.

// new services should have a system user that the service code itself uses to access things about that service
// a system role member can add users to the group service
// which means a system account can access user data of any user by adding them to a role in the service group

// The CL API itself is defined below, with some useful supporting functions. Actual endpoints on the API should then be 
// defined in separate files under the endpoints directory, by adding routes to CLapi, and using the functions within that namespace

// api login example:
// curl -X GET "http://api.cottagelabs.com/accounts" -H "x-id: vhi5m4NJbJF7bRXqp" -H "x-apikey: YOURAPIKEYHERE"
// curl -X GET "http://api.cottagelabs.com/accounts?id=vhi5m4NJbJF7bRXqp&apikey=YOURAPIKEYHERE"
CLapi = new Restivus({
  version: '',
  //apiPath: '',
  //useDefaultAuth: true,
  prettyJson: true,
  auth: {
    token: 'api.keys.hashedToken',
    user: function () {
      var xid = this.request.headers['x-id'];
      if ( !xid ) xid = this.request.query.id;
      if ( !xid ) {
        try {
          var u = Accounts.findUserByEmail(this.request.query.email);
          xid = u._id;          
        } catch (err) {}
      }
      if ( !xid ) {
        try {
          var u = Accounts.findUserByUsername(this.request.query.username);
          xid = u._id;          
        } catch (err) {}
      }
      var xapikey = this.request.headers['x-apikey'];
      if ( !xapikey ) {
        try {
          xapikey = this.request.query.apikey;
        } catch(err) {}
      }
      // TODO add a check for the clogins cookie. 
      // Add in the accounts module a push of a token into the clogins cookie
      // if we can match that hash, login the user
      // also have the user provide a device fingerprint using fingerprintjs2 when signing in
      // so using cookies would only work per-device if authorising to the API
      // have a global and a per-user setting to allow cookie re-auth or not, and also to allow cooke httponly or not
      console.log(this.request.headers.cookie);
      if ( xid === undefined ) xid = '';
      if ( xapikey === undefined ) xapikey = '';
      // TODO could add login logging here...
      if (xid) console.log('user ' + xid + ' authenticated to API with key ' + xapikey);
      return {
        userId: xid,
        token: Accounts._hashLoginToken(xapikey)
      };
    }
  }
});

// set a place to store internal methods - add a key whenever a new folder is added into the API endpoints folder
CLapi.internals = {academic:{}, use:{}, service:{}, convert:{}, scripts:{}};

CLapi.cauth = function(gr, user, cascade) {
  if ( gr.split('.')[0] === user._id ) return 'root'; // any user is effectively root on their own group - which matches their user ID
  if ( !user.roles ) return false; // if no roles can't have any auth, except on own group (above)
  // override if user has global root always return true
  if ( user.roles.__global_roles__ && user.roles.__global_roles__.indexOf('root') !== -1 ) {
    console.log('user ' + user._id + ' has role root');
    return 'root';
  }
  // otherwise get group and role from gr or assume global role
  var role, grp;
  var rp = gr.split('.');
  if ( rp.length === 1 ) {
    grp = '__global_roles__';
    role = rp[0];
  } else {
    grp = rp[0];
    role = rp[1];
  }
  // check if user has group role specified
  if ( user.roles[grp] && user.roles[grp].indexOf(role) !== -1 ) {
    console.log('user ' + user._id + ' has role ' + gr);
    return role;
  }
  // or else check for higher authority in cascading roles for group
  // TODO ALLOW CASCADE ON GLOBAL OR NOT?
  // cascading roles, most senior on left, allowing access to all those to the right
  var cascading = ['root','system','super','owner','auth','admin','publish','edit','read','info','public'];
  if ( cascade === undefined ) cascade = true;
  if ( cascade ) {
    var ri = cascading.indexOf(role);
    if ( ri !== -1 ) {
      for ( var r in cascading.splice(0,ri)) {
        var rl = cascading[r];
        if ( user.roles[grp].indexOf(rl) !== -1 ) {
          console.log('user ' + user._id + ' has cascaded role ' + grp + '.' + rl + ' overriding ' + gr);
          return rl;
        }
      }
    }
  }
  // otherwise user fails role check
  console.log('user ' + user._id + ' does not have role ' + gr);
  return false;
}
CLapi.rcauth = function(grs, user, cascade) {
  for ( var ro in grs ) {
    var a = cauth(grs[ro], user, cascade);
    if ( a ) return a;
  }
  return false;
}

CLapi.getuser = function(uid) {
  var u = Meteor.users.findOne({_id:uid});
  if (!u) u = Accounts.findUserByUsername(uid);
  if (!u) u = Accounts.findUserByEmail(uid);
  return u;
}




// data sources / apis to clone
// core, crossref, orcid, Sherpa Romeo/Juliet/Fact, opendoar / oarr, journaltocs, wikipedia/wikidata, arxiv, doaj
// base, dissemin.net, ubiquity, eupmc, ieee, nih medline, gtr, xcri

// processors
// contentmine, open citations, apc, oag, postcode, geoip, pdf2txt

// services
// accounts, catalogue, uk schools / universities info
// UK SIMD deprivation data and other geographical co-ords / census stats etc (that Mark has, and could be useful to query for other things)
// G4HE
// lantern
// leviathan (Marks prototype tool for managing technosocial reqs, could be developed into something useful for projects, perhaps)




