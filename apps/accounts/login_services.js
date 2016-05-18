login_services = {
  'https://opendatabutton.org/login': {
    from: 'contact@openaccessbutton.org',
    service: 'openaccessbutton',
    name: 'Open Data Button',
    subject: 'Please Activate your Account (+ some other details)',
    timeout: 30,
    text: "Hi there!\r\n\r\nThanks for signing up to get an Open Data Button!\r\n\r\nPlease go to the link below to activate your account:\r\n\r\n{{URL}}\r\n\r\nIn future you can find your account details, ongoing requests, and instrutions at:\r\n\r\nhttps://opendatabutton.org/account\r\n\r\nWe look forwards to helping you find data,\r\n\r\nJoe\r\n\r\np.s We are still testing and building the Open Data Button. If you have feedback at any point, let us know:\r\n\r\nhttps://opendatabutton.org/general-feedback\r\n\r\n Note: this single-use login link is only valid for {{TIMEOUT}}.",
    html: '<html><body><p>Hi there!</p><p>Thanks for signing up to get an Open Data Button!</p><p>Please go to the link below to activate your account:<p style="margin-left:2em;"><font size="-1"><a href="{{URL}}">{{URL}}</a></font></p><p><font size="-1">Note: this single-use login link is only valid for {{TIMEOUT}}.</font></p><p>In future you can find your account details, ongoing requests, and instrutions at:</p><p><a href="https://opendatabutton.org/account">https://opendatabutton.org/account</a></p><p>We look forwards to helping you find data,</p><p>Joe</p><p>p.s We are still testing and building the Open Data Button. If you have feedback at any point, let us know:</p><p><a href="https://opendatabutton.org/general-feedback">https://opendatabutton.org/general-feedback</a></p></body></html>'
  },
  'https://lantern.cottagelabs.com': {
    //background: 'green',
    //logo: 'http://static.cottagelabs.com/cottagelabslogo.png',
    extra: 'By signing up and signing in you agree to the<br><a href="https://lantern.cottagelabs.com/terms" target="_blank">Lantern terms of use</a>',
    back: 'https://lantern.cottagelabs.com',
    hashurl: 'http://accounts.cottagelabs.com?for=https://lantern.cottagelabs.com',
    timeout: 600,
    service: 'lantern',
    name: 'Lantern',
    subject: 'Please sign in to Lantern',
    text: "Hi!\r\n\r\nPlease go to the link below to sign in to your account:\r\n\r\n{{URL}}\r\n\r\nOr enter this code into the login page: {{CODE}}\r\n\r\nNote: this single-use login is only valid for {{TIMEOUT}}.\r\nThis is an automated email. Replies are NOT monitored.",
    html: '<html><body><p>Hi!</p><p>Please go to the link below to sign in to your account:<p><a href="{{URL}}">{{URL}}</a></p><p>Or enter this code into the login page: {{CODE}}</p><p>Note: this single-use login is only valid for {{TIMEOUT}}.<br><br>This is an automated email. Replies are NOT monitored.</p></body></html>'
  }
}
