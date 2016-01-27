
// an email forwarder

CLapi.addRoute('sendmail', {
  get: {
    action: function() {
      return {status: 'success', data: {info: 'POST a JSON obj with fr, to, subj, text, html, atts and it will get emailed'} };
    }
  },
  post: {
    authRequired: true,
    action: function() {
      // TODO: check the groups the user is part of, and know which groups are allowed to send mail
      // TODO: get the json content and send it to sendmail
      CLapi._sendmail();
    }
  }
});

CLapi.internals.sendmail = function(opts) {

  if ( !opts.from ) opts.from = ADMIN_ACCOUNT_ID;
  if ( !opts.to ) opts.to = ADMIN_ACCOUNT_ID;
  if ( !opts.subject ) opts.subject = 'MAIL SENT WITHOUT SUBJECT!';
  if ( !opts.text ) opts.text = "";
  if ( !opts.html ) opts.html = "";
  if ( !opts.atts ) opts.atts = [];
  
  // TODO: find out how to send attachments using node Email below
  // TODO: check if node Email accepts lists for from, to
  
  Email.send({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html
  });
}