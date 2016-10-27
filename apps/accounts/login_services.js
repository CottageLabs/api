
// remove opendatabutton.org once that site is taken down
// accounts and test CL subdomains must exist to be allowed but need no data because they use the default
// the content of this file can be publicly available on the accounts system client side UI, so should not contain secrets
// although it could be edited locally to make it seem that an auth can be submitted from an unaproved source, the server side copy cannot be edited
// so the server side must always check where logins are coming from (although this can be faked too)
// service can alternatively point to an object, which must contain at least name. Can also have role, otherwise new users are created with default 'user' role
// any other values found in service object will be stored in the user account object service section for the service named
// if registration is false, users will not receive a token if they do not already have an account with access to the requested service
// TODO in the case of registration not being allowed, a reg request should be created somewhere and an email should be sent to whoever looks after registration request for the service
// perhaps for registration if not true it should be an email address rather than false
// domain is the domain that you want the user to have a login cookie set on, once they have logged in
// As per the default, using .domain.com allows that domain and all subdomains.
// TODO may add a feature to login users to other domains too, in which case domain will become domains
// a "secure" key can also be set, to make cookies secure or not - this is just for DEV, cookie security is controlled by app and user account settings
// profile is a list of keys that can point to strings or bools of data that the service requires about the user. Rather than going in the user profile directly, 
// which is totally and only controllable by the user, these keys will go in a profile object in the service object. If present, the user can be prompted to provide / edit them
// role is the role that should be given to the registering user
login_services = {
  default: {
    profile: [],
    registration: true,
    role: 'user',
    domain: '.cottagelabs.com',
    from: 'us@cottagelabs.com',
    service: 'cottagelabs',
    name: 'Cottage Labs',
    subject: 'Please complete your {{ACTION}} for {{NAME}}',
    timeout: 30,
    text: "Your {{SERVICE}} {{ACTION}} security code is:\r\n\r\n{{LOGINCODE}}\r\n\r\nor use this link:\r\n\r\n{{LOGINURL}}\r\n\r\nnote: this single-use code is only valid for {{TIMEOUT}}.",
    html: '<html><body><p>Your <b><i>{{SERVICE}}</i></b> {{ACTION}} security code is:</p><p style="margin-left:2em;"><font size="+1"><b>{{LOGINCODE}}</b></font></p><p>or click on this link</p><p style="margin-left:2em;"><font size="-1"><a href="{{LOGINURL}}">{{LOGINURL}}</a></font></p><p><font size="-1">note: this single-use code is only valid for {{TIMEOUT}}.</font></p></body></html>'
  },
  'https://accounts.cottagelabs.com': {},
  'https://test.cottagelabs.com': {},
  'https://opendatabutton.org/login': {
    domain: '.opendatabutton.org',
    from: 'Open Access Button <admin@openaccessbutton.org>',
    service: 'openaccessbutton',
    name: 'Open Data Button',
    subject: 'Please Authenticate your Account (+ some other details)',
    timeout: 30,
    text: "Hi there!\r\n\r\nThanks for using Open Data Button!\r\n\r\nPlease go to the link below to authenticate your account:\r\n\r\n{{LOGINURL}}\r\nOr enter this code into the login page: {{LOGINCODE}}\r\n\r\n\r\nIn future you can find your account details, ongoing requests, and instrutions at:\r\n\r\nhttps://opendatabutton.org/account\r\n\r\nWe look forwards to helping you find data,\r\n\r\nJoe\r\n\r\np.s We are still testing and building the Open Data Button. If you have feedback at any point, let us know:\r\n\r\nhttps://opendatabutton.org/general-feedback\r\n\r\n Note: this single-use login link is only valid for {{TIMEOUT}}.",
    html: '<html><body><p>Hi there!</p><p>Thanks for signing up to get an Open Data Button!</p><p>Please go to the link below to authenticate your account:<p style="margin-left:2em;"><font size="-1"><a href="{{LOGINURL}}">{{LOGINURL}}</a></font></p><p>Or enter this code into the login page: {{LOGINCODE}}</p><p><font size="-1">Note: this single-use login link is only valid for {{TIMEOUT}}.</font></p><p>In future you can find your account details, ongoing requests, and instrutions at:</p><p><a href="https://opendatabutton.org/account">https://opendatabutton.org/account</a></p><p>We look forward to helping you find data,</p><p>Joe</p><p>p.s We are still testing and building the Open Data Button. If you have feedback at any point, let us know:</p><p><a href="https://opendatabutton.org/general-feedback">https://opendatabutton.org/general-feedback</a></p></body></html>'
  },
  'https://openaccessbutton.org/account': {
    profile: ['profession','confirm_public','confirm_terms','orcid','affiliation'],
    domain: '.openaccessbutton.org',
    from: 'Open Access Button <admin@openaccessbutton.org>',
    service: 'openaccessbutton',
    name: 'Open Access Button',
    subject: 'Please Authenticate your Account (+ some other details)',
    timeout: 30,
    template: 'login.txt',
    text: "Hi there!\r\n\r\nThanks for using Open Access Button!\r\n\r\nPlease go to the link below to authenticate your account:\r\n\r\n{{LOGINURL}}\r\nOr enter this code into the login page: {{LOGINCODE}}\r\n\r\n\r\nIn future you can find your account details, ongoing requests, and instrutions at:\r\n\r\nhttps://openaccessbutton.org/account\r\n\r\nWe look forwards to helping you find articles,\r\n\r\nJoe\r\n\r\np.s We are still testing and building the Open Access Button. If you have feedback at any point, let us know:\r\n\r\nhttps://opendatabutton.org/general-feedback\r\n\r\n Note: this single-use login link is only valid for {{TIMEOUT}}.",
    html: '<html><body><p>Hi there!</p><p>Thanks for using Open Access Button!</p><p>Please go to the link below to authenticate your account:<p style="margin-left:2em;"><font size="-1"><a href="{{LOGINURL}}">{{LOGINURL}}</a></font></p><p>Or enter this code into the login page: {{LOGINCODE}}</p><p><font size="-1">Note: this single-use login link is only valid for {{TIMEOUT}}.</font></p><p>In future you can find your account details, ongoing requests, and instrutions at:</p><p><a href="https://openaccessbutton.org/account">https://openaccessbutton.org/account</a></p><p>We look forward to helping you find articles,</p><p>Joe</p><p>p.s We are still testing and building the Open Access Button. If you have feedback at any point, let us know:</p><p><a href="https://opendatabutton.org/general-feedback">https://opendatabutton.org/general-feedback</a></p></body></html>'
  },
  'https://lantern.cottagelabs.com': {
    from: 'lantern@cottagelabs.com',
    timeout: 600,
    service: 'lantern',
    name: 'Lantern',
    subject: 'Please sign in to Lantern',
    text: "Hi!\r\n\r\nPlease go to the link below to sign in to your account:\r\n\r\n{{LOGINURL}}\r\n\r\nOr enter this code into the login page: {{LOGINCODE}}\r\n\r\nNote: this single-use login is only valid for {{TIMEOUT}}.\r\nThis is an automated email. Replies are NOT monitored.",
    html: '<html><body><p>Hi!</p><p>Please go to the link below to sign in to your account:<p><a href="{{LOGINURL}}">{{LOGINURL}}</a></p><p>Or enter this code into the login page: {{LOGINCODE}}</p><p>Note: this single-use login is only valid for {{TIMEOUT}}.<br><br>This is an automated email. Replies are NOT monitored.</p></body></html>'
  }
}

login_services['https://compliance.cottagelabs.com'] = login_services['https://lantern.cottagelabs.com'];

login_services['http://oab.test.cottagelabs.com/account'] = JSON.parse(JSON.stringify(login_services['https://openaccessbutton.org/account']));
login_services['http://oab.test.cottagelabs.com/account'].domain = '.cottagelabs.com';
login_services['http://oab.test.cottagelabs.com/account'].secure = false;

login_services['http://lantern.test.cottagelabs.com'] = JSON.parse(JSON.stringify(login_services['https://lantern.cottagelabs.com']));
login_services['http://lantern.test.cottagelabs.com'].secure = false;
login_services['http://wellcome.test.cottagelabs.com'] = login_services['http://lantern.test.cottagelabs.com'];




