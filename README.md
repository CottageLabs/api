# API

The Cottage Labs API system.

![Codeship](https://codeship.com/projects/0913c170-a8de-0133-e356-528fa7782574/status?branch=master)

This system is an attempt to combine many and various useful functions all into one API system that 
we can easily run across a cluster of machines for simple scalability and useful interaction. The 
aim is to provide functionality that is generally useful for an "open access research infrastructure", 
and we include a collection of "use" endpoints that are simple libraries around other useful OA APIs.

This codebase contains a set of "apps" that can be built up individually or used as subsections of functionality.

The main app is the CL API app itself, that exposes all the functionality desired via an API.

Next is the accounts app, which provides an auth system for the API and also for the other apps, and 
it can also be used by external applications VIA the API too. The accounts system also includes a 
groups system (in development).

New apps can be added, if they need to be deployed as part of this codebase itself to take direct 
advantage of the fucntionality it contains. This also allows for using the features of meteor, as this 
codebase is based on meteor. However, it is expected that most specific development would take place in 
a separate repo dedicated to that app, and that most apps can therefore be developed as simpler client-side 
apps that just call this API for the server-side functionality they need.

To add server-side API functionality to support a particular app, all functionality should go in the 
apps/clapi/server/endpoints/service/ folder, in a file (or folder with multiple files) named after the service. 
They follow a simple pattern - declare the API routes, then call methods that should be appended to the CLapi.internals 
object. Then to add client-side app fucntionality, start a new folder in the apps/ folder, or start a separate repo 
to build and maintain a separate client app. Client apps can then call their respective API endpoints directly, or a 
suitable proxy URL can be set up and configured using nginx. 

Docs are being added in public/docs, although these may move elsewhere. This is under heavy development 
at the moment, and although open source it is not something that is likely to be particularly useful to 
other people or to which we envisage receiving many contributions.

A push to develop will auto-deploy to our dev API. A push to master will auto-deply to our live API, which also triggers a 
mupx deploy to update the cluster that serves the live API. We use Codeship for deployment, the above badge indicates current 
status of the master deployment.

To run, install meteor then run this with:

meteor --settings settings.json --port 3002

(or whatever port you want it on)

We also use mupx to deploy on a cluster - there is a mup settings file too at mup.json.

This code should follow the 12-factor approach wherever possible, so that they can be scaled 
on infrastructure with simple nginx upstream routes to handle load balancing.

Also read about structuring Meteor apps if developing this. What is currently in the apps folder could later be 
distributed as meteor packages, but for now is not necessary, so they are just packaged in there for neatness.

The settings.json file needs to know all the necessary overall settings, then functionality should be created 
in the apps folder, one for each piece of functionality. Settings may be private (auth keys for other services etc) 
so it should not be included in the public repo.




