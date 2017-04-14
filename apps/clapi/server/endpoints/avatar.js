
CLapi.addRoute('avatar', {
  get: {
    action: function() {
      if (this.queryParams.email) {
        return CLapi.internals.avatar(this.queryParams.email,this.queryParams.size);
      } else {
        return {status: 'success', data: {info: 'returns an avatar image url where possible, if given an email param'} };
      }
    }
  }
});

CLapi.internals.avatar = function(email,size,def) {
  if (size === undefined) size = 100;
  if (def === undefined) def = 'https://static.cottagelabs.com/avatar.jpg';
  var img = '';

  // check our own services if any start storing image URLs
  var u = CLapi.internals.accounts.retrieve(email);
  if (u && u.profile && u.profile.avatar) img = u.profile.avatar;
  
  // check gravatar
  if (!img) {
    var CryptoJS = Meteor.npmRequire("crypto-js");
    var hash = CryptoJS.MD5(email.toLowerCase()).toString();
    var timg = "https://www.gravatar.com/avatar/" + hash + '?s=' + size + '&d=' + def;
    try {
      var check = Meteor.http.call('GET',timg); // node will throw an error on a 404
      img = timg;
    } catch(err) {}
  }

  // check google
  if (!img) {
    try {
      var url = 'http://picasaweb.google.com/data/entry/api/user/' + email + '?alt=json';
      var res = Meteor.http.call('GET',url);
      img = res.data.entry.gphoto$thumbnail.$t;
    } catch(err) {}
  }
  
  if (img && u && u.profile && !u.profile.avatar ) Meteor.users.update(u._id,{$set:{'profile.avatar':img.split('&d=')[0]}});

  if (!img) img = def;
  return img;
  
}

