
// an email forwarder
mail_template = new Mongo.Collection("mail_template");
CLapi.addCollection(mail_template);

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
      CLapi.internals.mail.error(this.request.body);
      return {};
    }
  }
});

/*CLapi.addRoute('mail/test', {
  get: {
    action: function() {
      //CLapi.internals.sendmail_test();
      return {status: 'success', data: {} };
    }
  }
});*/



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
  }
  // TODO what if list of emails to go with list of records?
  
  if ( !opts.text && !opts.html ) {
    opts.text = opts.content ? opts.content : "";
  }
  if (opts.content) delete opts.content;
  
  // can also take opts.headers
  // also takes opts.attachments, but not required. Should be a list of objects as per 
  // https://github.com/nodemailer/mailcomposer/blob/7c0422b2de2dc61a60ba27cfa3353472f662aeb5/README.md#add-attachments
  
  if (mail_url) {
    process.env.MAIL_URL = mail_url;
    console.log('temporarily setting mail url to ' + mail_url);
  }
  Email.send(opts);
  if (mail_url) process.env.MAIL_URL = Meteor.settings.MAIL_URL;
}

/*CLapi.internals.mail.test = function() {
  CLapi.internals.mail.send({
    from: "mark@cottagelabs.com",
    to: [Meteor.settings.openaccessbutton.osf_address,"odaesa@gmail.com"],
    subject: 'On submitting files to the OSF in a convoluted manner',
    text: "hello",
    attachments:[{
      fileName: 'myfile.txt',
      filePath: '/home/cloo/att_test.txt'
    }]
  });
}*/


CLapi.internals.mail = {}
CLapi.internals.mail.send = CLapi.internals.sendmail;

CLapi.internals.mail.error = function(content) {
  CLapi.internals.sendmail({
    from: "mark@cottagelabs.com",
    to: "mark@cottagelabs.com",
    subject: 'An error dump',
    text: JSON.stringify(content,undefined,2)
  });
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
    // there must be variables to read OUT - should it be a controlled set, or anything?
    var vs = ['subject'];
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




