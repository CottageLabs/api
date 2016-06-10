
mail_templates = {
  data: {
    author_request: {
      subject: 'A request to share the data behind your article',
      text: "Dear colleague,\n\n \
We are writing from the Open Data Button, a tool helping connect people with the data behind research papers they're interested in.\n\n \
{{blocks}} of our users are interested in the data behind one of your papers:\n\n \
{{article}}\n\n \
and have publicly requested that you share it.\n\n \
Our users are just some of many who would benefit if you shared the data supporting this paper, and you can read about why our users \
would like access to the data on the public request page at:\n\n \
https://opendatabutton.org/request/{{rid}}\n\n \
Sharing data could lead to increased citations for your paper, people citing your dataset, and the acceleration of research in your area.\n\n \
You can make easily make your data publicly available by simply uploading your data and notes in your preferred format, \
or if it is already publicly available by just providing a URL where we can find it. Just go to our upload page by following the link below:\n\n \
https://opendatabutton.org/response/{{respond}}\n\n \
We'll use the Open Science Framework to host, preserve, and identify your data. We'll use the paper title and abstract to provide \
initial metadata and licence the data CC0 (the recommended licence for sharing data).\n\n \
We know preparing to share your data can take some time, and you're probably extremely busy, so you can put this request on hold if necessary. \
You can tell us how long you need by just visiting the corresponding link below:\n\n \
https://opendatabutton.org/response/{{respond}}?hold=7days\n \
https://opendatabutton.org/response/{{respond}}?hold=14days\n \
https://opendatabutton.org/response/{{respond}}?hold=28days\n \
https://opendatabutton.org/response/{{respond}}?refuse=true\n\n \
Once you've uploaded or provided a link, our community will confirm it and then you'll receive an open data badge to recognise your efforts.\n\n \
If you have any other issues, email us at data@openaccessbutton.org.\n\n \
Kind Regards,\n\n\n \
The Open Data Button Robot\n\n \
P.S The Open Data Button just launched, we'd love your feedback - just email us at data@openaccessbutton.org.\n\n \
You're receiving this email because an Open Data Button user requested access to data supporting a paper you're an author of. \
If you'd like to stop receiving emails from Open Data Button, you can let us know by visiting this link: https://opendatabutton.org/dnr/{{email}}."
    }
  },
  article: {
    author_request: {
      subject: 'A request to share your article',
      text: "Dear colleague,\n\n \
We are writing from the Open Access Button, a tool helping connect people with the research papers they're interested in.\n\n \
{{blocks}} of our users are interested in one of your papers:\n\n \
{{article}}\n\n \
and have publicly requested that you share it.\n\n \
Our users are just some of many who would benefit if you shared this paper, and you can read about why our users \
would like access to it on the public request page at:\n\n \
https://openaccessbutton.org/request/{{rid}}\n\n \
Sharing your research could lead to increased citations for your paper and the acceleration of research in your area.\n\n \
You can make easily make your paper publicly available by simply uploading it to our site, \
or if it is already publicly available by just providing a URL where we can find it. Just go to our upload page by following the link below:\n\n \
https://openaccessbutton.org/response/{{respond}}\n\n \
We'll use Zenodo to store and preserve your research for you.\n\n \
We know sharing your work can take some time, and you're probably extremely busy, so you can put this request on hold if necessary. \
You can tell us how long you need by just visiting the corresponding link below:\n\n \
https://openaccessbutton.org/response/{{respond}}?hold=7days\n \
https://openaccessbutton.org/response/{{respond}}?hold=14days\n \
https://openaccessbutton.org/response/{{respond}}?hold=28days\n \
https://openaccessbutton.org/response/{{respond}}?refuse=true\n\n \
If you have any other issues, email us at contact@openaccessbutton.org.\n\n \
Kind Regards,\n\n\n \
The Open Access Button Robot\n\n \
P.S We'd love your feedback - just email us at data@openaccessbutton.org.\n\n \
You're receiving this email because an Open Access Button user requested access to a paper you're an author of. \
If you'd like to stop receiving emails from Open Access Button, you can let us know by visiting this link: https://openaccessbutton.org/dnr/{{email}}."
    }    
  }
}



/*
2a - OAB System emails user to confirm request (post moderation) [Final]

To: {user email}
CC:
Bcc:
From:
Attachements:

Subject: Request sent! 

Body:

Hi {username},

Your request for the data supporting {paper name} has been sent. You can view, and share your request here: {request page URL}. 

Cheers, 

The Open Data Button Robot

p.s We’re still pretty new at this, we’d love to know what you think of the tool! You can tell us here. 

3a - OAB sends follow up after 1 week [Draft]

To: {corresponding email}
CC:
Bcc:
From: [odb]
Attachements: 

Subject: A request to share the data behind your article

Body: 

Dear Colleague, 

We’re sure you’re extremely busy, but I wanted to see if you’d seen our last email? Copied below.

[1st email]


3b - OAB Sends follow up after two week [Draft]

To: {corresponding email}
CC:
Bcc:
From: [odb]
Attachements:

Subject: 

Body:
Dear Colleague, 

We’re sorry to bug you. Looks like last couple of weeks might’ve been bad for you, any chance we could hear back now? 

[1st email]
3c - OAB Sends follow up after three weeks [Draft]

To: {corresponding email}
CC:
Bcc:
From: [odb]
Attachements:

Subject: Someone is interested in your work, will you share it with them?
Body:
Dear Colleague, 

Sorry to bother you again. We’ve tried to reach out a couple of times about sharing the data supporting one of your papers with {username}. This is the final time we’ll follow up with you, in a week we’ll mark this public request as failed. 

[1st email]
3d - OAB email to author to say it’s failed (after 4 weeks) [Done]

To: {corresponding email}
CC:
Bcc:
From: [odb]
Attachements:

Probably not tell people it’s failed. 
4 - Response to author upon updating status [proofed 2.29]

To: {author}
CC:
Bcc:
From: [OAB]
Attachements:

Subject: [original header]

Body:
Dear Colleague, 

We’ve received your response, and this will be passed on to {username}. 

{If they can’t share data: We’re sorry to hear you can’t share your data with us. It would be helpful if you could share why. Let us know here.}

Thank you for keeping use in the loop, 

The Open Data Button Robot

4 - Response to users waiting for data upon updating status [proofed 2.29]

To: {user email}
CC:
Bcc:
From: [OAB]
Attachments:

Subject: The data you requested is on the way

Body:

Hi {username}, 

The author of “{paper title}” has responded to your request, and has said that they will be able to share the data in {status}. 

Once it’s ready, we’ll send it to you. We’ll then ask you take a look, and verify that it’s the data you requested and that it’s understandable. This will allow us to reward to author with an Open Data Badge for their efforts. 

Cheers, 

The Open Access Button Robot

ps. We’re still pretty new at this, so we’d love your feedback on this message and your experience so far! Please do provide some feedback here. 
6 - Structured email to OSF for meeting system  [Needs COS Review]

To: [Email TBD from COS]
CC:
BCC
From: [Email TBD from OAB]
Attachments: Files from author

Subject: [Article title]

Body:

Project Description: [Article Abstract]

Author Email: [Author Email]

Author Name: [Author Name]


8 - Response on deposit from COS to Author  [Need COS Review]

To: [submitting email]
CC:
Bcc:
From: [COS]
Attachements:

Subject: Congratulations! Your data has been added to the Open Science Framework.  

Body:

Hello,

//Congratulations! Your data has been added to the Open Science Framework (OSF). You now have a permanent, citable URL that you can share: [ URL ]. The Open Data Button will send this to the person who requested your data. Once they’ve verified the submission, you’ll be sent a badge recognising your efforts helping to make research more open. 

Get more from the OSF by enhancing your page with the following:
Collaborators/contributors to the submission
Charts, graphs, and data that didn't make it onto the submission
Links to related publications or reference lists
Metadata on this submission

To claim your Open Science Framework account, please create a password by clicking here: [ URL ]. Please verify your profile information at [ URL ]. 

Sincerely yours,
The OSF Robot
11 - Email to users awaiting data [needs proofing]
To: {requesting users}
CC:
Bcc:
From: [OAB]
Attachements:

Subject: We’ve got the data you requested! 

Body:

Hi {username}, 

The author has responded to your request for the data supporting “{paper title}”. You can view what they’ve sent here: {Data URL}. 

Hopefully, everything is in order. Please take some time take a look and confirm it’s what you requested and that there are enough supporting materials to make the data understandable. 

[Yes, this is what I wanted and it looks fine!] [This is what I wanted, but I don’t understand it] [No, this isn’t what I expected]

Once you’ve done this, we can either reward the author with an Open Data Badge or follow up to understand what needs changing. 

Cheers, 

The Open Data Button Robot

p.s What have you thought so far? We’d love to know! Feedback on your experience here.  
13 - Email to author awarding badge [proofed 2.29]
To: {author}
CC:
Bcc:
From: [OAB]
Attachments: Open Data Badge Image

Subject: Here is your shiny new Open Data Badge 

Body:

Dear Colleague, 

Thanks again for sharing your data. We’re happy to say that we’ve verified everything, and can now award you your Open Data Badge! 

Open Data Badges can be used to demonstrate your commitment to making, and your ability to create, Open Data. The request page for this data has also been marked as an open data success!  

We’ve attached images of the Open Data Badge that you can display proudly on any pages you manage. 

Cheers, 

The Open Access Button Robot

p.s  What have you thought so far? We’d love to know! Please give us feedback on your experience here.  
MISC1 - Response to Author requesting not to be contacted  [proofed 2.29]

To: {author email}
CC:
Bcc:
From: [OAB]
Attachments:

Subject: Request Received

Body:
Dear Colleague, 

We’ve received your request to not be automatically contacted regarding sharing the data behind your research. You will not be automatically contacted in future. We apologize for any inconvenience. 

Our team is aiming to accelerate research and increase its impact. If we’re doing something wrong, we want to fix it! We would value your feedback on our system here. 

Best wishes, 

The Open Data Button Robot

MISC2 - Email to person requesting via request page [proofed 2.29] 

To: {sign up email}
CC:
Bcc:
From:  [ODB]
Attachments:

Subject: Thanks for supporting a request! 

Body:

Hi, 

We’ve received your request for the data supporting “{paper title}”. We’ll keep you in the loop about the request, and send you that data if it’s made available. 

You can further support the request (and make it more likely you’ll get the data) by sharing this request with people in your field! Here is the URL to share: {request URL}

If you want to make other requests for data, we suggest you get your own Open Data Button. You can download one at OpenDataButton.org.

Cheers, 

The Open Data Button Robot

MISC3 - Email to author upon more requests [proofed 2.29] 

To: {correspondence address}
CC:
Bcc:
From: [ODB]
Attachments:

Subject: We’ve just had more requests for your data

Body:

Dear Colleague, 

This is a quick note to let you know that we’ve had another person request for you to share your data. Now {request number} people would like to access your data. 

In case you missed our last email, we’ve included it below. 

Our best, 

The Open Data Button Robot

You're receiving this because an Open Data Button user requested access to data supporting a paper of which you’re an author. If you'd like to stop receiving automatic emails from Open Data Button, please click here.

[insert the original email]
MISC4 - Email to original requester when someone else requests via request page [proofed 2.29] 

To: {requester email}
CC:
Bcc:
From: [ODB]
Attachments:

Subject: Your request has been supported! 

Body:
Hi {username}, 

Great news - your request has been supported! Someone else requested the data you are in interested in via your original request page. We’ll let the author know that now {number of requests} people would like them to share their data. 

The more people that request the data, the more likely an author is the share it! If you haven’t already, make sure to share the request with people you know. 

Our best, 

The Open Data Button Robot

 */

