# HTTPS for imported feeds

OPML import prefers HTTPS when the feed is available there, falling back to HTTP if needed.
If an HTTPS check stalls, import cancels it so working HTTP feeds can still be imported.
