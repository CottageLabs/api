# API

The Cottage Labs API system.

![Codeship](https://codeship.com/projects/0913c170-a8de-0133-e356-528fa7782574/status?branch=master)

Provides access to Cottage Labs accounts and is the API layer over any other service we need to run on our infrastructure.

A push to develop will auto-deploy to our dev API. A push to master will auto-deply to our live API, which also triggers a 
mupx deploy to update the cluster that serves the live API. We use Codeship for deployment, the above badge indicates current 
status of the master deployment.

See public/docs for all the info (being updated)

This is a meteor app. Install meteor then run this with:

meteor --settings settings.json --port 3002

(or whatever port you want it on)

This app and everything it does should follow the 12-factor approach wherever possible, so that they can be scaled 
on infrastructure with simple nginx upstream routes to handle load balancing.

Also read about structuring Meteor apps if developing this. What is currently in the apps folder could later be 
distributed as meteor packages, but for now is not necessary, so they are just packaged in there for neatness.

The settings.json file needs to know all the necessary overall settings, then functionality should be created 
in the apps folder, one for each piece of functionality. Apps themselves should have a server/settings.js file 
in which the necessary settings are put. Those settings may be private (auth keys for other services etc) so the 
app folder may contain a README.md that explains what settings need to be added to run it (because they will not 
get pushed to the git repo).

