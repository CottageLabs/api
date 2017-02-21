
// an email forwarder
mail_template = new Mongo.Collection("mail_template");

mail_progress = new Mongo.Collection("mail_progress");
mail_progress.before.insert(function (userId, doc) {
  if (!doc.createdAt) doc.createdAt = Date.now();
});
mail_progress.after.insert(function (userId, doc) {
  CLapi.internals.es.insert('/clapi/mail/' + this._id, doc);
});
mail_progress.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.updatedAt = Date.now();
});
mail_progress.after.update(function (userId, doc, fieldNames, modifier, options) {
  CLapi.internals.es.insert('/clapi/mail/' + doc._id, doc);
});
mail_progress.after.remove(function (userId, doc) {
  CLapi.internals.es.delete('/clapi/mail/' + doc._id);
});


CLapi.addRoute('mail/validate', {
  get: {
    action: function() {
      return {status: 'success', data: CLapi.internals.mail.validate(this.queryParams.email) };
    }
  }
});

CLapi.addRoute('mail/send', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'Nothing here yet'} };
    }
  },
  post: {
    roleRequired:'root', // how to decide roles that can post mail remotely?
    action: function() {
      // TODO: check the groups the user is part of, and know which groups are allowed to send mail
      // TODO: get the json content and send it to sendmail
      //CLapi._sendmail();
      return {}
    }
  }
});

// leaving this one in as deprecated, in use elsewhere
CLapi.addRoute('sendmail/error', { post: { action: function() { CLapi.internals.mail.error(this.request.body); return {}; } } });
CLapi.addRoute('mail/error', {
  post: {
    action: function() {
      CLapi.internals.mail.error(this.request.body,this.queryParams.token);
      return {};
    }
  }
});

CLapi.addRoute('mail/progress', {
  get: {
    action: function() {
      var rt = '/clapi/mail/_search';
      if (!this.queryParams.sort) this.queryParams.sort = 'createdAt:desc';
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
      CLapi.internals.mail.progress(this.request.body,this.queryParams.token);
      return {};      
    }
  }
});

CLapi.addRoute('mail/test', {
  get: {
    action: function() {
      return CLapi.internals.mail.test();
      //return {status: 'success', data: {} };
    }
  }
});



// deprecating this to mail.send below, but keep for now until check for usage
CLapi.internals.sendmail = function(opts,mail_url) {
  console.log('Sending an email');
  // should change this to use mailgun API instead of smtp
  // https://documentation.mailgun.com/quickstart-sending.html?utm_source=mailgun&utm_medium=email&utm_campaign=transactional-dns-propagation#send-via-smtp
  if ( !opts.from ) opts.from = Meteor.settings.ADMIN_ACCOUNT_ID;
  if ( !opts.to ) opts.to = Meteor.settings.ADMIN_ACCOUNT_ID; // also takes cc, bcc, replyTo, but not required. Can be strings or lists of strings
  if ( !opts.subject ) opts.subject = 'MAIL SENT WITHOUT SUBJECT!';
  
  if (opts.template) {
    var parts = CLapi.internals.mail.construct(opts.template,opts.vars);
    for ( var p in parts ) opts[p] = parts[p];
    delete opts.template;
  }
  // TODO what if list of emails to go with list of records?
  
  if ( !opts.text && !opts.html ) {
    opts.text = opts.content ? opts.content : "";
  }
  if (opts.content) delete opts.content;
  
  // can also take opts.headers
  // also takes opts.attachments, but not required. Should be a list of objects as per 
  // https://github.com/nodemailer/mailcomposer/blob/7c0422b2de2dc61a60ba27cfa3353472f662aeb5/README.md#add-attachments
  
  if (opts.post && opts.attachments === undefined) {
    // TODO once tested switch the var check so that using api is default, and opts.smtp has to be set true to send by smtp
    // send via POST to mailgun API
    delete opts.post;
    var mailgunapi = 'https://api.mailgun.net/v3';
    var service = opts.mail_service ? opts.mail_service : Meteor.settings.MAIL_SERVICE;
    var url = mailgunapi + '/' + service + '/messages';
    var apik = opts.mail_apikey ? opts.mail_apikey : Meteor.settings.MAIL_APIKEY;
    delete opts.mail_service;
    delete opts.mail_apikey
    if (typeof opts.to === 'object') opts.to = opts.to.join(',');
    console.log('Sending mail via mailgun API on URL ' + url);
    console.log(opts)
    try {
      var posted = Meteor.http.call('POST',url,{params:opts,auth:'api:'+apik});
      console.log(posted);
      return posted;
    } catch(err) {
      return err;
    }
  } else {
    if (mail_url) {
      process.env.MAIL_URL = mail_url;
      console.log('temporarily setting mail url to ' + mail_url);
    }
    Email.send(opts);
    if (mail_url) process.env.MAIL_URL = Meteor.settings.MAIL_URL;
    return {};
  }
}


CLapi.internals.mail = {}
CLapi.internals.mail.send = CLapi.internals.sendmail;

CLapi.internals.mail.validate = function(email,apikey) {
  if (apikey === undefined) apikey = Meteor.settings.MAIL_PUBLIC_APIKEY; // NOTE should use public key, not private key
  var u = 'https://api.mailgun.net/v3/address/validate?syntax_only=false&address=' + email + '&api_key=' + apikey;
  var v = Meteor.http.call('GET',u);
  return v.data;
}

CLapi.internals.mail.test = function() {
  return CLapi.internals.mail.send({
    post:true,
    from: "dnr@openaccessbutton.io",
    to: ["mark@cottagelabs.com"],
    subject: 'Test me via POST',
    text: "hello",
    html: '<p><b>hello</b></p>'
    /*attachments:[{
      fileName: 'myfile.txt',
      filePath: '/home/cloo/att_test.txt'
    }]*/
  });
}

// mailgun progress webhook target
// https://documentation.mailgun.com/user_manual.html#tracking-deliveries
// https://documentation.mailgun.com/user_manual.html#tracking-failures
CLapi.internals.mail.progress = function(content,token) {
  // could do a token check here
  // could delete mail logs older than 1 week or so
  // if a failure event, ping an error msg to me
  if (content['message-id'] !== undefined && content['Message-Id'] === undefined) content['Message-Id'] = '<' + content['message-id'] + '>';
  mail_progress.insert(content);
  try {
    if (content.event === 'dropped') {
      CLapi.internals.mail.send({
        from: "alert@cottagelabs.com",
        to: "mark@cottagelabs.com",
        subject: "mailgun send error",
        text: JSON.stringify(content,undefined,2)
      });    
    }
  } catch(err) {}
}

CLapi.internals.mail.error = function(content,token) {
  var to;
  var mail_url;
  var subject = 'error dump';
  if (token) {
    try {
      // for robin this could check tokens against actual user tokens on the live service
      // but then would only work if the live service is up - so don't bother for now
      to = Meteor.settings.mail.error.tokens[token].to;
      mail_url = Meteor.settings.mail.error.tokens[token].mail_url;
      subject = Meteor.settings.mail.error.tokens[token].service + ' ' + subject;
      console.log('Sending error email for ' + Meteor.settings.mail.error.tokens[token].service);
    } catch(err) {}
  }
  if (to !== undefined) {
    CLapi.internals.mail.send({
      from: "sysadmin@cottagelabs.com",
      to: to,
      subject: subject,
      text: JSON.stringify(content,undefined,2)
    },mail_url);
  }
}

CLapi.internals.mail.template = function(search,template) {
  if (template) {
    mail_template.insert(template);
  } else if (search) {
    if (typeof search === 'string') {
      // get the named template - could be filename without suffix
      // or could be look for filename
      var exists = mail_template.findOne(search);
      return exists ? exists : mail_template.findOne({template:search});
    } else {
      // search object, return matches, e.g. could be {service:'openaccessbutton'}
      var tmpls = mail_template.find(search).fetch();
      return tmpls.length === 1 ? tmpls[0] : tmpls;
    }
  } else {
    return mail_template.find().fetch();
  }
}

CLapi.internals.mail.substitute = function(content,vars,markdown) {
  var ret = {};
  // read variables IN to content
  for ( var v in vars ) {
    if (content.toLowerCase().indexOf('{{'+v+'}}') !== -1) {
      var rg = new RegExp('{{'+v+'}}','gi');
      content = content.replace(rg,vars[v]);
    }
  }
  if (content.indexOf('{{') !== -1) {
    var vs = ['subject','from','to','cc','bcc'];
    for ( var k in vs ) {
      var key = content.toLowerCase().indexOf('{{'+vs[k]) !== -1 ? vs[k] : undefined;
      if (key) {
        var keyu = content.indexOf('{{'+key.toUpperCase()) !== -1 ? key.toUpperCase() : key;
        var val = content.split('{{'+keyu)[1].split('}}')[0].trim();
        if (val) ret[key] = val;
        var kg = new RegExp('{{'+keyu+'.*?}}','gi');
        content = content.replace(kg,'');
      }
    }
  }
  ret.content = content;
  if (markdown) {
    // generate a text and an html element in ret
    var marked = Meteor.npmRequire('marked');
    ret.html = marked(ret.content);
    ret.text = ret.content.replace(/\[.*?\]\((.*?)\)/gi,"$1");
  }
  return ret;
}

CLapi.internals.mail.construct = function(tmpl,vars) {
  // if filename is .txt or .html look for the alternative too.
  // if .md try to generate a text and html option out of it
  var template = CLapi.internals.mail.template(tmpl);
  var md = template.filename.endsWith('.md');
  var ret = vars ? CLapi.internals.mail.substitute(template.content,vars,md) : {content: template.content};
  if (!md) {
    // look for the alternative too
    var alt;
    if (template.filename.endsWith('.txt')) {
      ret.text = ret.content;
      alt = 'html';
    } else if (template.filename.endsWith('.html')) {
      ret.html = ret.content;
      alt = 'txt';
    }
    try {
      var match = {filename:template.filename.split('.',[0])+'.'+alt};
      if (template.service) match.service = template.service;
      var other = CLapi.internals.mail.template(match);
      ret[alt] = vars ? CLapi.internals.mail.substitute(other.content,vars).content : other.content;
    } catch(err) {}
  }
  return ret;
}




