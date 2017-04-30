
var moment = Meteor.npmRequire('moment');

leviathan_statement = new Mongo.Collection("leviathan_statement");
leviathan_score = new Mongo.Collection("leviathan_score");
leviathan_source = new Mongo.Collection("leviathan_source");

//CLapi.internals.es.make(leviathan_statement,'leviathan','statement'); // this does not work yet because es is not available at this point... refactor should fix

leviathan_source.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});

leviathan_statement.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
leviathan_statement.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/leviathan/statement/' + this._id, doc);
});
leviathan_statement.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
  doc.updated_date = moment(doc.updatedAt,"x").format("YYYY-MM-DD HHmm");
});
leviathan_statement.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/leviathan/statement/' + doc._id, doc);
});
leviathan_statement.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/leviathan/statement/' + doc._id);
});

leviathan_score.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
  doc.created_date = moment(doc.createdAt,"x").format("YYYY-MM-DD HHmm");
});
leviathan_score.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/leviathan/score/' + this._id, doc);
});
leviathan_score.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
  doc.updated_date = moment(doc.updatedAt,"x").format("YYYY-MM-DD HHmm");
});
leviathan_score.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/leviathan/score/' + doc._id, doc);
});
leviathan_score.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/leviathan/score/' + doc._id);
});

CLapi.addRoute('service/leviathan', {
  get: {
    action: function() {
      if (this.queryParams.url) {
        return CLapi.internals.service.leviathan.import.url(this.queryParams);
      } else if (this.queryParams.repo) {
        return CLapi.internals.service.leviathan.import.github(this.queryParams);
      } else if (this.queryParams.empty) {
        leviathan_statement.remove({});
        leviathan_score.remove({});
        return {};
      } else {
        return {status: 'success', data: {info: 'The Leviathan API.'} };
      }
    }
  }
});

CLapi.addRoute('service/leviathan/statement/:sid', {
  get: {
    action: function() {
      var uid = this.userId;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        var acc = CLapi.internals.accounts.retrieve(apikey);
        uid = acc._id;
      }
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,undefined,uid,this.queryParams);
    }
  },
  post: {
    action: function() {
      var s = this.request.body;
      var uid = this.userId;
      if ( this.request.headers['x-apikey'] || this.queryParams.apikey ) {
        var apikey = this.queryParams.apikey ? this.queryParams.apikey : this.request.headers['x-apikey'];
        if (apikey) {
          var acc = CLapi.internals.accounts.retrieve(apikey);
          if (acc) uid = acc._id;
        }
      }
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,s,uid,this.queryParams);
    }
  },
  delete: {
    roleRequired: 'root',
    action: function() {
      return CLapi.internals.service.leviathan.statement(this.urlParams.sid,true);
    }
  },
});

CLapi.addRoute('service/leviathan/statement/:sid/scores', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.scores(this.urlParams.sid);
    }
  }
});

CLapi.addRoute('service/leviathan/statement/:sid/responses', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.responses(this.urlParams.sid);
    }
  }
});

CLapi.addRoute('service/leviathan/statements', {
  get: {
    action: function() {
      var rt = '/leviathan/statement/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/leviathan/statement/_search',data);
    }
  }
});

CLapi.addRoute('service/leviathan/scores', {
  get: {
    action: function() {
      var rt = '/leviathan/score/_search';
      if (this.queryParams) {
        rt += '?';
        for ( var op in this.queryParams ) rt += op + '=' + this.queryParams[op] + '&';
      }
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('GET',rt,data);
    }
  },
  post: {
    action: function() {
      var data;
      if ( JSON.stringify(this.bodyParams).length > 2 ) data = this.bodyParams;
      return CLapi.internals.es.query('POST','/leviathan/score/_search',data);
    }
  }
});

CLapi.addRoute('service/leviathan/:uid', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.user(this.urlParams.uid);
    }
  }
});

CLapi.addRoute('service/leviathan/:uid/statements', {
  get: {
    action: function() {
      return CLapi.internals.service.leviathan.statements(this.urlParams.uid);
    }
  }
});


CLapi.internals.service.leviathan = {};

CLapi.internals.service.leviathan.lid = function(prev) {
  var allowed = ['1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','J','K','M','N','P','R','T','V','W','X','Y','Z'];
  var length = 8;
  var lid;
  if (prev === undefined) prev = {}
  var last = leviathan_statement.findOne(prev,{sort:{_id:1}});
  if (last) {
    lid = last._id;
    var trip = false;
    var back = [];
    for ( var l = lid.length-1; l > 0; l-- ) {
      var lp = allowed.indexOf(lid[l]);
      if (trip || l === lid.length-1) {
        lp += 1;
        trip = false;
      }
      if (lp >= allowed.length) {
        trip = true;
        lp = 0;
      }
      back.push(allowed[lp]);
    }
    lid = 'L';
    for ( var b = length-2; b >= 0; b-- ) lid += back[b];
  } else {
    lid = 'L';
    for ( var c = 1; c < length; c++ ) lid += allowed[0];
  }
  if (leviathan_statement.findOne(lid)) { // this is good enough for now, but beware the race...
    return CLapi.internals.service.leviathan.lid(lid);
  } else {
    return lid;
  }
}

/*
{
  _id: 'Leviathan ID of this statement'
  category: 'statement', 'or', 'compatible' ... (applies to the score)
  statement: 'I am the statement that was made'
  about: 'leviathan statement ID or external URL that this statement/response is about'
  info: 'I am extra supporting info that could include URLs'
  tags: [list of tags - could be extracted from statement and info too]
  mentions: [list of usernames that appear to be mentioned]
  score: -1, 0, 1
  sentiment: 'agree', 'disagree', 'neutral'
  relation: 'Leviathan ID of related statement e.g. the statement this one is incompatible with'
  uid: 1234567890
  username: myusername
  email: myemal - keep this as well as username, or just as username when no username?
}
*/
CLapi.internals.service.leviathan.statement = function(sid,obj,uid,filters,imported) {
  if (obj === true) {
    leviathan_statement.remove(sid); // remove the scores related to the ID?
    return {};
  } else if (obj) {
    delete obj._id; // is set from incoming url route, into sid param, so don't overwrite
    if (!obj.category) obj.category = 'statement';
    if (!obj.sentiment) obj.sentiment = 'neutral';
    if (!obj.score) { // could allow UI to set scores for different terms
      if (obj.sentiment === 'disagree') {
        obj.score = -1;
      } else if (obj.sentiment === 'agree') {
        obj.score = 1;
      } else {
        obj.score = 0;
      }
    }
    if (obj.statement) { // it is possible to receive a statement with no "statement" - essentially a sentiment response, so just creates a score
      // TODO still to fix multiple newlines problem in statement
      obj.statement = obj.statement.replace(/\r\n/g,'\n').replace(/\n+/g,'\n');
      // TODO trim leading and trailing newlines
      // do additional keyword extraction and sentiment analysis on the statement?
      //obj.extraction = CLapi.internals.use.google.cloud.language(obj.statement);
      // extract all URLs, domains, email addresses?
      // what about doing @username#tag ...
      obj.tags = [];
      if (obj.statement.indexOf('#') !== -1) {
        if (obj.statement.indexOf('#') === 0) obj.statement = ' ' + obj.statement;
        var hashsplit = obj.statement.split(' #');
        for ( var h in hashsplit) {
          var hash = hashsplit[h].split(' ')[0].split(',')[0].split('\n')[0].toLowerCase();
          if (h !== "0" && obj.tags.indexOf(hash) === -1) obj.tags.push(hash);
        }
        obj.tags = obj.tags.sort();
      }
      obj.mentions = [];
      if (obj.statement.indexOf('@') !== -1) {
        if (obj.statement.indexOf('@') === 0) obj.statement = ' ' + obj.statement;
        var atsplit = obj.statement.split(' @');
        for ( var a in atsplit) {
          var at = atsplit[a].split(' ')[0].split(',')[0].split('\n')[0].toLowerCase();
          if (a !== "0" && obj.mentions.indexOf(at) === -1) obj.mentions.push(at);
        }
        obj.mentions = obj.mentions.sort(); // worth sorting tags and mentions?
      }
      // just from the statement or the info too? info is harder cos could have urls etc, but could be relevant...
      obj.statement = obj.statement.trim();
      if (!obj.about && obj.statement.indexOf('\n') !== -1 && obj.statement.trim().toLowerCase().replace(/ /g,'').indexOf('about:') === 0) {
        obj.about = obj.statement.split('\n')[0].trim().toLowerCase().replace(/ /g,'').split('about:')[1];
        obj.statement = obj.statement.split('\n')[1].trim();
        // TODO trim leading and trailing newlines again
      }
      if (obj.statement.indexOf('\n') !== -1) {
        obj.info = obj.statement.split(/\n(.+)/)[1];
        obj.statement = obj.statement.split('\n')[0];
        // TODO trim leading and trailing newlines again
      }
      if (sid && sid !== 'new') {
        leviathan_statement.update(sid,{$set:obj});
      } else {
        //obj._id = CLapi.internals.service.leviathan.lid();
        leviathan_statement.insert(obj);
      }
    }
    // create a score record of this response - track any score data in statement itself, for convenience?
    // TODO check if the user has already created a score on the statement, if so, delete the previous score
    if (obj.about && obj.about.indexOf('L') === 0 && obj.about.length === 8) {
      var prev = leviathan_score.findOne({about:obj.about,uid:obj.uid});
      if (prev) leviathan_score.remove(prev._id);
    }
    // TOD should score just contain everything about the statement? Makes it big but perhaps more useful...
    if (!imported) {
      var rel = obj.about && obj.about.indexOf('L') === 0 && obj.about.length === 8 ? leviathan_statement.findOne(obj.about) : obj;
      var scr = {
        category: rel.category,
        occurrence: rel.occurrence,
        source: rel.source,
        type: rel.type,
        salience: rel.salience,
        keywords: rel.keywords,
        img: rel.img,
        about: obj.about ? obj.about : rel._id,
        relation: obj.relation ? obj.relation : rel.relation,
        score: obj.score ? obj.score :rel.score,
        statement: obj.statement ? obj.statement : rel.statement,
        sentiment: obj.sentiment ? obj.sentiment : rel.sentiment,
        uid: obj.uid
      }
      if (uid) {
        scr.uid = uid;
        var usr = CLapi.internals.accounts.retrieve(uid);
        scr.email = usr.emails[0].address;
        scr.name = usr.emails[0].address.split('@')[0];
      }
      leviathan_score.insert(scr);
    }
    if (filters && filters.random) {
      filters.size = filters.random;
      delete filters.random;
      return CLapi.internals.service.leviathan.statement('random',undefined,uid,filters);
    } else {
      return obj;
    }
  } else if (sid === 'random') {
    // if there are filters, apply them to the statements that can be returned
    var sz = 1;
    if (filters) {
      if (filters.size) {
        sz = parseInt(filters.size);
        delete filters.size;
      }
      // format the filters into a proper mongo query filter
    } else {
      filters = {};
    }
    var statement;
    if (uid) {
      var statements = leviathan_statement.find(filters).count();
      filters.uid = uid;
      var scores = leviathan_score.find(filters).count();
      if (scores < statements) {
        statement = leviathan_statement.aggregate([{$match:filters}, { $sample: { size: sz } }]);
      }
    } else {
      statement = leviathan_statement.aggregate([{$match:filters}, { $sample: { size: sz } }]);
    }
    if (statement) {
      for ( var st in statement ) {
        statement[st].views = statement[st].views === undefined ? 1 : statement[st].views + 1; // this could become unmanageable at large scale but OK for now
        leviathan_statement.update(statement[st]._id,{$set:{views:statement[st].views}});
      }
      return statement;
    } else {
      return {};
    }
  } else {
    var s = leviathan_statement.findOne(sid);
    s.views = s.views === undefined ? 1 : s.views + 1; // this could become unmanageable at large scale but OK for now
    leviathan_statement.update(s._id,{$set:{views:s.views}});
    return s;
  }
  
}

CLapi.internals.service.leviathan.responses = function(sid) {
  // get the chain of responses from this statement sid if any
}

CLapi.internals.service.leviathan.scores = function(sid,filters) {
  // get the scores for this statement sid, possibly filtered
}

CLapi.internals.service.leviathan.user = function(uid) {
  // is this worth doing? get specific user info related to leviathan - not profile stuff, not private stuff
  // could be things like their scores 
}

CLapi.internals.service.leviathan.statements = function(uid) {
  // is this worth doing? get all statements made by a user - would it be too many? May be as well to use statement querying
  // or is there any sort of useful statements overview for a given user?
}

CLapi.internals.service.leviathan.import = {}

CLapi.internals.service.leviathan.import.url = function(opts) {
  var src = Meteor.http.call('GET', opts.url).content;
  //src = src.replace(/\n/g,'').replace(/<ul.*?<\/ul>/g,'').replace(/<a.*?<\/a>/g,''); // these can lead to slightly tidier results but lose a lot of interesting words
  src = src.replace(/<\/li>/g,'.');
  var content = CLapi.internals.convert.xml2txt(undefined,src);
  var ggl = CLapi.internals.use.google.cloud.language(content,'entities');
  var lthings = [];
  var things = [];
  var length = opts.words ? opts.words : 2;
  for ( var e in ggl.entities ) {
    var ent = ggl.entities[e];
    var per = ent.name;
    /*var sts = (ent.name[0].toUpperCase() + ent.name.substring(1,ent.name.length)).split(' ');
    var psts = [];
    for ( var ps in sts ) {
      if (sts[ps].replace(/[^a-zA-Z]/g,'').length > 1 && sts[ps].indexOf('@') === -1 && psts.indexOf(sts[ps]) === -1) psts.push(sts[ps]); 
    }
    if (psts.length === 2) psts = [psts[0] + ' ' + psts[1]];
    for ( var pe in psts ) {
      var per = psts[pe];*/
      if (lthings.indexOf(per.toLowerCase()) === -1){// && per.toUpperCase() !== per) { // avoid things that are all caps...
        lthings.push(per.toLowerCase());
        things.push(per);
        var category = opts.category ? opts.category : 'or';
        var exists = leviathan_statement.findOne({statement:per}); // what params should be used to check existence? How old to limit new versions, or within categories?
        //var occurrence = CLapi.internals.tdm.occurrence(content.toLowerCase(),per.toLowerCase());
        // the newer google entities returns a mentions list, so can use the length of that as occurrence count
        var occurrence = ent.mentions.length;
        if (!exists) {
          var keywords = [];
          var wp = undefined;
          if /*( ent.name[0].toUpperCase() === ent.name[0] &&*/ (ent.type === 'PERSON' || ent.type === 'ORGANIZATION' || ent.type === 'LOCATION' ) { // could do places as well... 
            var wlp = ent.metadata && ent.wikipedia_url ? ent.wikipedia_url.split('wiki/').pop() : per;
            /*if ( ent.type === 'PERSON' && per.indexOf(' ') !== -1 ) {
              if ( per.split(' ')[1][0].toUpperCase() === per.split(' ')[1][0] ) wp = CLapi.internals.tdm.categorise(wlp);
            } else {*/
              wp = CLapi.internals.tdm.categorise(wlp);
            //}
          }
          // should get user data for statement, but for now just assume they are all by me
          // is it worth looking up google knowledge graph mid and wikidata info (returned from categorise) now?
          // e.g. for companies can extract ticker ID, address, website, etc...
          var ns = {
            occurrence:occurrence,
            category: category,
            source: opts.url,
            type: ent.type.toLowerCase(),
            salience:ent.salience,
            statement:per,
            uid:'WhPxWCrbZgRS5Hv4W',
            username:'Leviathan',
            email:'mark@cottagelabs.com'
          };
          if (wp) {
            ns.keywords = wp.keywords;
            ns.about = wp.url;
            ns.wikidata = wp.wikidata;
            ns.img = wp.img;
          }
          if (ent.metadata && ent.metadata.mid) ns.mid = ent.metadata.mid;
          CLapi.internals.service.leviathan.statement('new',ns,undefined,undefined,true);
        } else {
          var occ = exists.occurrence ? exists.occurrence + occurrence : occurrence;
          leviathan_statement.update(exists._id,{$set:{occurrence:occ}});
        }
      }
    //}
  }
  var ret = {status:'success',count:things.length,things:things,ggl:ggl,url:opts.url,category:opts.category,src:src,content:content};
  CLapi.internals.mail.send({
    to: 'mark@cottagelabs.com',
    subject: 'Leviathan statements imported',
    text: JSON.stringify(ret,undefined,2)
  });
  return ret;
}

CLapi.internals.service.leviathan.import.github = function(opts) {
  var issues = CLapi.internals.use.github.issues(opts);
  var count = 0;
  for ( var i in issues.data ) {
    var issue = issues.data[i];
    var exists = leviathan_statement.findOne({statement:issue.title});
    if (!exists) {
      count += 1;
      CLapi.internals.service.leviathan.statement('new',{
        category: 'statement',
        about: issue.html_url,
        entity: 'github',
        owner: opts.owner,
        repo: opts.repo,
        statement:issue.title,
        info: issue.body,
        meta: issue,
        uid:'WhPxWCrbZgRS5Hv4W',
        username:'Leviathan',
        email:'mark@cottagelabs.com'
      },undefined,undefined,true);
    }
  }
  return {status:'success',count:count};
}

CLapi.internals.service.leviathan.import.sheet = function(opts) {
  
}

CLapi.internals.service.leviathan.import.csv = function(opts) {
  
}





/*
Leviathan scoring
L1111111:24:17:3
leviathan ID, disagree, agree, related statements

or could just use contention ratio as score, but also need popularity score to indicate how many responses
contention 0 is highly contentious, 1 is not contentious. New statement with 0 stated value 
is therefore more contentious than one with a stated value (because more likely to indicate a personal choice)
(this may seem counter-intuitive but does not need to be explicitly stated to users)
when showing questions, show contentious statements first
contention of course can go down as question increases in popularity, if more answers favour one direction
Does contention have to be calculated directly at all, or just left to be read from scores?
maybe score format is better as count of responses, strength of feeling, contention ratio
in which case contention probably more intuitive if inverted and scaled to 100
so L%123A:r1000s25c100 has 1000 answers, 25% strong feels, and max contention (meaning 50/50 response weight)
or how about r1000/c100 which would put popular contentious answers below popular uncontentious ones
that would mean the system favours popular uncontentious issues to the top of search results
but isn't it contentious issues we want more responses to? perhaps depends on params then. 
to see what we "know", search by popular with low contention
can also search what to weigh in on - popular with high contention
*/

// SCORE DETAILS
// agree / disagree
// positive / negative
// strongly stated (positive or negative)
// alternative (Let's go dancing - yes, no, no let's go running)
// authoritative (user can claim authority - that is a statement, and other users can agree or disagree)
// support (with or without evidence)
// refute (with or without evidence)
// proof - logical, that statement is / is not true
// accept (e.g. if multiple refutations, what is the accepted answer?)
// duplicate - indicate that the question is a duplicate, and others can agree / disagree on that too, to weight whether it is or not
// contradiction - indicate that the user stating "the sky is blue" elsewhere already said "the sky is red"
// a more complex contradiction would be "men mostly commit violence, target men to reduce it" but elsehwere says "black people mostly commit crime, don't profile black people"
// should a user being agreed to have made contradictory statements have a reduction applied to the weight of all their responses?
// probably - so if user makes 1000 statements, and is marked as being contradictory 500 times, then any response they make to other questions only has +- .5 instead of 1
// how many users need to agree to a response claiming a statement is a duplicate or a contradiction before it is accepted as being such?
// perhaps it does not matter - just flag it as possibly contradictory, possibly duplicate, and leave it up to the creator to change it
// in which case, dups are accepted as such by the creator, and just become pointers to the one they dup'd, and add scores to it
// whilst contradictions if left standing have negative effect on creator vote power. if accepted as contradiction, don't have negative effect, but not deleted - stand as evidence

// user has to be able to sign up using our usual account auth
// also need to ask user to give us access to facebook and twitter (and other places they may make statements)
// user should be able to pick interest tags to follow

// create statements / questions
// look for @ and # terms provided in the statement
// look for ones specific to leviathan?
// extract keywords
// calculate positive / negative sentiment?
// calculate sentence hash (still to choose best way to do, aim is to compare similarity to other statements)
// search for relevant reference material for statement?
// count the number of responses to this statement so far? Or have the response endpoint iterate a counter on the statement itself

// have particular statement sets or # that drive specific action
// like someone could request an #expert user to #review their #article

// where could statements come from?
// facebook / twitter feeds, other places people actually make statements
// email users to ask them to answer certain questions
// browser plugin allowing user to ask for #review on the content of a particular web url
// or even a highlighted statement on the page of a given url
// for business use, requirements / issues, and feedback / rebuttals to them
// github issues, for example. we can see who cares about certain types of problem, or who works on certain sorts of thing

// such a browser app could also check for any comments on a given page
// but this is just like commentator / annotator - useful? maybe. different context.

// demonstrate proximity of statements, answers, and users solely by what is written
// (assumption is content is an illusion at an individual level, and meaning is ONLY in relation)

// email users with questions to generate more responses
// allow email responses direct to questions

// what does a new user get out of it, beyond the first group who volunteer as tests?
// a user could see the flavour of their locale, to get a better sense of their own community
// a user may want to get a better sense of someone else
// on facebook for example the rainbow overlays of profile pics could have red vs blue overlays, 
// either for a user viewing their own feed coloured to indicate the colour of users as represented 
// in the feed of the current user (because can only access what the user can access this way), 
// or for users signed up directly themselves having their profile coloured based on the entirety 
// of their user activity - indicating their leanings to other people

// is activism causal, or caused by, actions (or at least (stated) beliefs about actions)


