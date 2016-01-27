In the service directory put API endpoints that are specific to particular services.

Of course, particular services may have their own APIs running from their own codebase, but if not, here is a useful place to put them.

For example the oabutton API is being written into here, so that the oabutton site itself can be simplified down to just the content.

There can also be an oabutton site that is a meteor app if necessary, or some other sort of server-side app, but that app can talk to 
the API endpoints herein where necessary. So it would just be what is required to run the app, everything else handled from a service 
endpoint here.