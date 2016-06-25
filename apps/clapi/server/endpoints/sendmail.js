
// an email forwarder

CLapi.addRoute('sendmail', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'POST a JSON obj with fr, to, subj, text, html, atts and it will get emailed'} };
    }
  },
  post: {
    authRequired: true,
    roleRequired:'root', // how to decide roles that can post mail?
    action: function() {
      // TODO: check the groups the user is part of, and know which groups are allowed to send mail
      // TODO: get the json content and send it to sendmail
      //CLapi._sendmail();
      return {}
    }
  }
});

CLapi.addRoute('sendmail/test', {
  get: {
    action: function() {
      //CLapi.internals.sendmail_test();
      return {status: 'success', data: {} };
    }
  }
});

CLapi.internals.sendmail = function(opts,mail_url) {
  console.log('Sending an email');
  // should change this to use mailgun API instead of smtp
  // https://documentation.mailgun.com/quickstart-sending.html?utm_source=mailgun&utm_medium=email&utm_campaign=transactional-dns-propagation#send-via-smtp
  if ( !opts.from ) opts.from = Meteor.settings.ADMIN_ACCOUNT_ID;
  if ( !opts.to ) opts.to = Meteor.settings.ADMIN_ACCOUNT_ID; // also takes cc, bcc, replyTo, but not required. Can be strings or lists of strings
  if ( !opts.subject ) opts.subject = 'MAIL SENT WITHOUT SUBJECT!';
  if ( !opts.text ) opts.text = "";
  if ( !opts.html ) opts.html = "";
  // can also take opts.headers
  // also takes opts.attachments, but not required. Should be a list of objects as per 
  // https://github.com/nodemailer/mailcomposer/blob/7c0422b2de2dc61a60ba27cfa3353472f662aeb5/README.md#add-attachments
  
  if (mail_url) process.env.MAIL_URL = mail_url;
  Email.send(opts);
  if (mail_url) process.env.MAIL_URL = Meteor.settings.MAIL_URL;
}

CLapi.internals.sendmail_test = function() {
  CLapi.internals.sendmail({
    from: "mark@cottagelabs.com",
    to: [Meteor.settings.openaccessbutton.osf_address,"odaesa@gmail.com"],
    subject: 'On submitting files to the OSF in a convoluted manner',
    text: "hello",
    attachments:[{
      fileName: 'myfile.txt',
      filePath: '/home/cloo/att_test.txt'
    }]
  });
}


