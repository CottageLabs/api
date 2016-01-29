
// the oabutton API.

CLapi.addRoute('service/oabutton', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'the oabutton API'} };
    }
  }
});

// who can register for oabutton?
CLapi.addRoute('service/oabutton/register', {
  get: {
    action: function() {
      if (this.queryParams) {
        return CLapi.internals.service.oabutton.register(this.queryParams);        
      } else {
        return CLapi.internals.service.oabutton.register(this.request.body);
      }
    }
  }  
});

// get rid of pointless retrieve loop - have user enter their API key into the plugin when they install it.

// auth is required for posting into blocked
CLapi.addRoute('service/oabutton/blocked', {
  get: {
    action: function() {
      if (this.queryParams) {
        return CLapi.internals.service.oabutton.register(this.queryParams);        
      } else {
        return CLapi.internals.service.oabutton.register(this.request.body);
      }
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.blocked(this.request.body,this.urlParams.bid);          
    }
  }
});
CLapi.addRoute('service/oabutton/blocked/:bid', {
  get: {
    action: function() {
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.blocked(this.request.body,this.urlParams.bid);      
    }
  },
  delete: {
    action: function() {
    }
  }
});

// some sort of auth is required for adding something to the wishlist
CLapi.addRoute('service/oabutton/wishlist', {
  get: {
    action: function() {
      if (this.queryParams) {
        return CLapi.internals.service.oabutton.wishlist(this.queryParams);        
      } else {
        return CLapi.internals.service.oabutton.wishlist(this.request.body);
      }
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.wishlist(this.request.body,this.urlParams.bid);          
    }
  }
});
CLapi.addRoute('service/oabutton/wishlist/:wid', {
  get: {
    action: function() {
    }
  },
  post: {
    action: function() {
      return CLapi.internals.service.oabutton.wishlist(this.request.body,this.urlParams.wid);      
    }
  },
  delete: {
    action: function() {
    }
  }
});

// what auth is required for triggering requests?
CLapi.addRoute('service/oabutton/request', {
  get: {
    action: function () {
      
    }
  },
  post: {
    action: function() {
      
    }
  }
});

// followup, receive

CLapi.addRoute('service/oabutton/status', {
  get: {
    action: function () {
      
    }
  }
});


CLapi.internals.service.oabutton = {};
CLapi.internals.service.oabutton.register = function(data) {
  var keys = ["username","name","email","profession"];
  // if we have an account for this email address already, then get it
  // otherwise create a new account, which should trigger the account validation email to sign in - how to return from that if it happens?
  // on the account object, check there is an oabutton service object and add profession to it?
  // the rest is generic account data so can go in the top level
  // return user ID and API key
}

CLapi.internals.service.oabutton.blocked = function(data) {
  //event.data['coords_lat'] = vals.get('coords_lat','')
  //event.data['coords_lng'] = vals.get('coords_lng','')
  //event.data['doi'] = vals.get('doi','')
  //event.data['url'] = vals.get('url','')
  //event.data['user_id'] = current_user.id
  //event.data['user_name'] = current_user.data.get('username','')
  //event.data['user_profession'] = current_user.data.get('profession','')
  //event.save()
  //call the status api and save the output for this URL
  //_status(vals['url'], vals=vals)
}

CLapi.internals.service.oabutton.wishlist = function(url,user) {
  // save a wishlist object for this user and this url
  // {'url':vals.get('url',''), 'id':wish.id }
  // return wishlist obj
  
}

CLapi.internals.service.oabutton.request = function(url,email) {
  // see if we have requested this already
  // if not create a new request record, of the url and the person triggering the request, and the email of who to contact
  // do we have the same contact email if we already have this request? Or is this a new personw we could contact for the same item?
  // when someone has requested this, put it on their wishlist
}

CLapi.internals.service.oabutton.followup = function(url) {
  // follow up with a request if we have not heard back yet
}

CLapi.internals.service.oabutton.receive = function(url) {
  // receive content that we requested - could be a deposit to our store, a URL to retrieve from, or a URL to link to
  // when we receive something, inform everyone who has it on their wishlist
}

CLapi.internals.service.oabutton.status = function(url) {
  // do we have an open URL to resolve this item to?
  // if not, check for it again using our resolver
  // if we find it update everything else
  // how many people have this on their wishlist
  // how many people have been blocked access to this
  // have we requested it and where is the request at
  // check contentmine for any facts about it
  // the url, if we have it (so even if we have it, we show how many people we gave access to)
}






