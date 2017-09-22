
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
  'accounts.cottagelabs.com': {},
  'test.cottagelabs.com': {},
  'openaccessbutton.org': {
    profile: ['profession','confirm_public','confirm_terms','orcid','affiliation'],
    domain: '.openaccessbutton.org',
    from: 'Open Access Button <donotreply@mg.openaccessbutton.org>',
    service: 'openaccessbutton',
    name: 'Open Access Button',
    subject: 'Please Authenticate your Account (+ some other details)',
    timeout: 30,
    template: 'login.html'
  },
  'lantern.cottagelabs.com': {
    from: 'lantern@cottagelabs.com',
    timeout: 600,
    service: 'lantern',
    name: 'Lantern',
    subject: 'Please sign in to Lantern',
    text: "Hi!\r\n\r\nPlease go to the link below to sign in to your account:\r\n\r\n{{LOGINURL}}\r\n\r\nOr enter this code into the login page: {{LOGINCODE}}\r\n\r\nNote: this single-use login is only valid for {{TIMEOUT}}.\r\nThis is an automated email. Replies are NOT monitored.",
    html: '<html><body><p>Hi!</p><p>Please go to the link below to sign in to your account:<p><a href="{{LOGINURL}}">{{LOGINURL}}</a></p><p>Or enter this code into the login page: {{LOGINCODE}}</p><p>Note: this single-use login is only valid for {{TIMEOUT}}.<br><br>This is an automated email. Replies are NOT monitored.</p></body></html>'
  },
  'weareleviathan.com': {
    from: 'Leviathan Industries <mark+leviathan@cottagelabs.com>',
    domain: '.weareleviathan.com',
    timeout: 60,
    service: 'leviathan',
    name: 'Leviathan',
    subject: 'Please sign in to Leviathan',
    text: "Hi!\r\n\r\nPlease go to the link below to sign in to your account:\r\n\r\n{{LOGINURL}}\r\n\r\nOr enter this code into the login page: {{LOGINCODE}}\r\n\r\nNote: this single-use login is only valid for {{TIMEOUT}}.\r\nThis is an automated email. Replies are NOT monitored.",
    html: '<html><body><p>Hi!</p><p>Please go to the link below to sign in to your account:<p><a href="{{LOGINURL}}">{{LOGINURL}}</a></p><p>Or enter this code into the login page: {{LOGINCODE}}</p><p>Note: this single-use login is only valid for {{TIMEOUT}}.<br><br>This is an automated email. Replies are NOT monitored.</p></body></html>'
  }
}

login_services['levor.club'] = JSON.parse(JSON.stringify(login_services['weareleviathan.com']));
login_services['levor.club'].domain = '.levor.club';
login_services['levor.club'].name = 'Levor';
login_services['levor.club'].subject = 'Please sign in to Levor';
login_services['levor.club'].secure = false;

login_services['jing.test.cottagelabs.com'] = JSON.parse(JSON.stringify(login_services['weareleviathan.com']));
login_services['jing.test.cottagelabs.com'].domain = '.cottagelabs.com';
login_services['jing.test.cottagelabs.com'].name = 'Bebejam';
login_services['jing.test.cottagelabs.com'].service = 'bebejam';
login_services['jing.test.cottagelabs.com'].subject = 'Please sign in to Bebejam';
login_services['jing.test.cottagelabs.com'].from = 'Bebejam <mark@cottagelabs.com>';

login_services['compliance.cottagelabs.com'] = login_services['lantern.cottagelabs.com'];

login_services['dev.openaccessbutton.org'] = JSON.parse(JSON.stringify(login_services['openaccessbutton.org']));
login_services['dev.openaccessbutton.org'].secure = false;

login_services['lantern.test.cottagelabs.com'] = JSON.parse(JSON.stringify(login_services['lantern.cottagelabs.com']));
login_services['wellcome.test.cottagelabs.com'] = login_services['lantern.test.cottagelabs.com'];
login_services['wellcome.test.cottagelabs.com'].secure = false;




