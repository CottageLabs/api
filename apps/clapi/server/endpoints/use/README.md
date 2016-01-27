
These should provide client-library-like access to remote APIs.

For example api.cottagelabs.com/use/doaj should proxy the DOAJ API

This could be useful for APIs that CL have authorised access to - we can have a "use" that knows how to use that API, 
and then our other apps just call OUR API, and the local settings of our API have our auth for that remote API. Then 
the use by our own apps or users of our version of the endpoint can be controlled by us, however we decide to do so.

Which brings up a point, we may need rate limiting attached to our user accounts. Perhaps global and per endpoint too.

