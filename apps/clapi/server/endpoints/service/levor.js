
// this mostly relies on leviathan, but is just some abstractions needed just for the game

CLapi.addRoute('service/levor/scoreboard', {
  get: {
    action: function() {
      var uid = this.userId;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
        uid = acc._id;
      }
      if (this.queryParams.uid) uid = this.queryParams.uid;
      return CLapi.internals.service.levor.scoreboard(this.queryParams.count,this.queryParams.score,this.queryParams.target,this.queryParams.daily,uid);
    }
  }
});

CLapi.addRoute('service/levor/graph', {
  get: {
    action: function() {
      return CLapi.internals.service.levor.graph();
    }
  }
});

CLapi.addRoute('service/levor/sources', {
  get: {
    action: function() {
      return leviathan_source.find({for:'levor'}).fetch();
    }
  }
});

CLapi.addRoute('service/levor/target', {
  get: {
    action: function() {
      var uid = this.userId;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
        uid = acc._id;
      }
      if (this.queryParams.uid) uid = this.queryParams.uid;
      return CLapi.internals.service.levor.target(this.queryParams.daily,uid);
    }
  }
});

CLapi.addRoute('service/levor/import', {
  get: {
    action: function() {
      return CLapi.internals.service.levor.import(this.queryParams.url);
    }
  }
});



CLapi.internals.service.levor = {}

CLapi.internals.service.levor.graph = function() {
  var scores = CLapi.internals.service.levor.scoreboard();
  var res = {nodes:[],links:[]};
  var entitynodes = {};
  var scorelinks = {};
  for ( var s in scores.count ) {
    var val = '';
    try { val = scores.count[s]._id.email[0].toUpperCase() + scores.count[s]._id.email.substring(1,scores.count[s]._id.email.indexOf('@')); } catch(err) {}
    var user = {
      key: 'user',
      group: 'user',
      value: val,
      size: 0,
      position: parseInt(s),
      img: (scores.count[s]._id.email ? CLapi.internals.avatar(scores.count[s]._id.email) : undefined)
    }
    res.nodes.push(user);
    var pos = res.nodes.length-1;
    leviathan_score.find({uid:scores.count[s]._id.uid,category:'levor'}).forEach(function(usc) {
      user.size += 1;
      if (scorelinks[usc.statement] === undefined) {
        var kl = {
          key: 'score',
          group: 'score',
          value: usc.statement,
          size: usc.occurrence,
          occurrence: usc.occurrence,
          sentiment: usc.score,
          img: usc.img
        }
        res.nodes.push(kl);
        scorelinks[usc.statement] = res.nodes.length-1;
        res.links.push({source:pos,target:res.nodes.length-1,sentiment:usc.score});
      } else {
        res.nodes[scorelinks[usc.statement]].size += 1;
        res.nodes[scorelinks[usc.statement]].sentiment += usc.score;
        res.links.push({source:pos,target:scorelinks[usc.statement],sentiment:usc.score});
      }
      /*var lp = res.nodes.length-1; // an experiment in linking nodes by type
      if (entitynodes[usc.type] === undefined) {
        res.nodes.push({
          key: 'type',
          group: 'type',
          value: 0,
          size: 0
        });
        entitynodes[usc.type] = res.nodes.length-1;
      }
      res.links.push({source:lp,target:entitynodes[usc.type]});*/
    });
    res.nodes[pos].size = user.size;
  }
  return res;
}

CLapi.internals.service.levor.scoreboard = function(count,score,target,daily,uid) {
  if (count === undefined && score === undefined) count = true;
  var res = {}
  var d = {$match:{category:'levor'}};
  var s = {$sort: {count:-1}};
  if (daily) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.$match.createdAt = {$gte:start.valueOf()};
  }
  if (count) {
    var qc = [];
    if (d) qc.push(d);
    qc.push({ $group: { _id: {uid:"$uid", name: "$name", email: "$email"}, count: {$sum:1}}  });
    qc.push(s);
    res.count = leviathan_score.aggregate(qc);
    if (res.count.length && res.count[0]._id.uid === null) res.count.shift();
  }
  if (score) {
    var qs = [];
    if (d) {
      d.$match.category = {$in:['levor','coin']};
      qs.push(d);
    }
    qs.push({ $group: { _id: {uid:"$uid", name: "$name", email: "$email"}, count: {$sum:"$score"}}  });
    qs.push(s);
    res.score = leviathan_score.aggregate(qs);
    if (res.score.length && res.score[0]._id.uid === null) res.score.shift();
  }
  if (target) res.target = CLapi.internals.service.levor.target(daily,uid);
  if (uid) {
    res.user = {position:{},uid:uid};
    if (target) {
      res.user.target = {found:[],available:[]}
      for ( var ut in res.target ) {
        if (res.target[ut].scored === true) {
          res.user.target.found.push(res.target[ut].statement);
        } else {
          res.user.target.available.push(res.target[ut].statement);
        }
      }
    }
    if (count) {
      for ( var c in res.count ) {
        if (res.count[c]._id.uid === uid) {
          res.user.position.count = parseInt(c);
          break;
        }
      }
    }
    if (score) {
      for ( var sc in res.score ) {
        if (res.score[sc]._id.uid === uid) {
          res.user.position.score = parseInt(sc);
          break;
        }
      }
    }
  }
  return res;
}

CLapi.internals.service.levor.target = function(daily,uid,limit) {
  // levor requires target words that the user can appear to be moving towards
  // this means a statement about another word, that is the "most popular" - and has some bonus score
  // if a levor user finds it, they get X points - like say the amount of points equal to that targets most popular score
  // so the target statements need a count of how often they occurred, or some other representation of their high value
  // possibly friends can choose/set a target word for the day/game, and their other friends have to try to find it
  // like for obscure words, this may be a reflection of their obscurity
  // to know that any levor selection is a move towards a target word, it needs to somehow match with the target
  // this could mean being the same sort of entity, sharing a keyword, or sharing a similar size or similar letters (levensthein distance could work here)
  // there should be a range of target words, starting with the most popular/valuable down to the least
  // or perhaps in the case of topical news, it is actually the least popular that are worth more... so an inversion of min and max occurrences
  // so this function just needs to return a list of target statements ordered by their value, and stating their value, and then all their metadata
  // then the UI can work out any time a user moves closer to a target word (this could be intentionally lost between play sessions, or stored in a cookie)
  // when the UI sees a user pick a target word, the UI submits a coin score matching that target word
  // so the target list should then be updated for that user - meaning target should be filtered by existing coin scores for the day by that user,
  // and the target list should indicate that user has already scored that target
  // so this just needs to be a statement find ordered by value, once a way to decide value is added to the statements
  // then if the user is known, just record whether or not the user has already scored on those targets
  // how many targets should there be? start with 10
  if (limit === undefined) limit = 10;
  var d = {category:'levor'};
  var s = {sort: {occurrence:-1}, limit:limit};
  if (daily) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.createdAt = {$gte:start.valueOf()};
  }
  var targets = leviathan_statement.find(d,s).fetch();
  if (uid) {
    for ( var t in targets ) {
      var tr = {about:targets[t]._id,category:'coin',uid:uid};
      if (daily) tr.createdAt = d.createdAt;
      var scored = leviathan_score.findOne(tr);
      if (scored) targets[t].scored = true;
    }
  }
  return targets;
}



CLapi.internals.service.levor.import = function(urls) {
  if (urls === undefined) {
    urls = [];
    leviathan_source.find({for:'levor'}).forEach(function(src) {
      urls.push(src.url);
    });
    if (urls.length === 0) {
      urls = [
        'http://www.bbc.co.uk/news',
        'https://www.theguardian.com/uk',
        'http://www.independent.co.uk',
        'https://www.ft.com',
        'http://www.huffingtonpost.co.uk',
        'https://www.nytimes.com',
        'http://www.newyorker.com',
        'http://www.dailymail.co.uk/home/index.html'
      ];
    }
  }
  if (typeof urls === 'string') urls = urls.split(',');
  var res = {};
  urls = [
    'http://www.dailymail.co.uk/home/index.html'
  ];
  for ( var u in urls ) {
    var e = leviathan_source.findOne({for:'levor',url:urls[u]});
    if (!e) leviathan_source.insert({for:'levor',url:urls[u]});
    res[urls[u]] = CLapi.internals.service.leviathan.import.url({url:urls[u],category:'levor'});
  }
  return res;
}


if ( Meteor.settings.levor && Meteor.settings.levor.cron ) {
  if ( Meteor.settings.levor.cron.import ) {
    SyncedCron.add({
      name: 'levor_daily_import',
      schedule: function(parser) { return parser.recur().on('00:00:01').time() },
      job: CLapi.internals.service.levor.import
    });
  }
}
