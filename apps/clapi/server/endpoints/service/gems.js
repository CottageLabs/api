
// API for hidden gems demo

hidden_gems = new Mongo.Collection("hidden_gems");
CLapi.addCollection(hidden_gems);

CLapi.addRoute('service/gems', {
  get: {
    action: function() {
      if ( this.queryParams.from && this.queryParams.from === 'gems') {
        var button = this.queryParams.button.toLowerCase();
        var gem = hidden_gems.findOne(button);
        if (gem) {
          if (gem.count === undefined) {
            gem.count = 1;
          } else {
            gem.count = parseInt(gem.count) + 1
          }
          hidden_gems.update(button,{$set:{count:gem.count}});
        } else {
          gem = {count:1,_id:button};
          gem._id = hidden_gems.insert(gem);
        }
        return gem;
      } else {
        return {status: 'success', data: {info: 'The Hidden Gems API.'} };      
      }
    }
  }
});

CLapi.addRoute('service/gems/:location', {
  get: {
    action: function() {
      if (this.urlParams.location === 'all') {
        var gems = hidden_gems.find({}).fetch();
        return {count:gems.length,gems:gems};        
      } else {
        var gem = hidden_gems.findOne(this.urlParams.location.toLowerCase());
        if ( gem ) {
          return gem;
        } else {
          return {statusCode: 404, body: {status: 'error', data: {info: '404 not found'}}}
        }        
      }
    }
  },
  post: {
    action: function() {
      var content = this.request.body;
      if (content.count !== undefined) content.count = parseInt(content.count);
      console.log(content);
      var gem = hidden_gems.findOne(this.urlParams.location.toLowerCase());
      content._id = this.urlParams.location.toLowerCase();
      if ( gem ) {
        hidden_gems.update(content._id,{$set:content});
        return gem;
      } else {
        hidden_gems.insert(content);
        return gem;
      }
    }
  }
});





