CLapi.addRoute('scripts/odb/fixrecords', {
  post: {
    authRequired: true,
    action: function() {
      var test = this.queryParams.test;
      var counts = {total:0,updated:0};
      var blocks = OAB_Blocked.find();
      blocks.forEach(function(block) {
        counts.total += 1;
        if (block.type === 'article') {
          if (block.plugin === undefined || block.plugin.indexOf('odb') !== -1) {
            counts.updated += 1;
            if (!test) OAB_Blocked.update(block._id,{$set:{type:'data'}});
          }
        } else if (block.type === undefined) {
          if ( block.plugin === undefined ) {
            counts.updated += 1;
            if (!test) OAB_Blocked.update(block._id,{$set:{type:'article'}});
          } else if ( block.plugin.indexOf('odb') !== -1 ) {
            counts.updated += 1;
            if (!test) OAB_Blocked.update(block._id,{$set:{type:'data'}});            
          }
        }
      });
      return counts;
    }
  }
});
