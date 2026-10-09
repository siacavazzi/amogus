# Selfie retention and access

Selfies are optional JPEG photos. The upload limit is 256 KiB.

Photos expire 24 hours after upload. The server refuses expired photo requests immediately.
The server deletes expired files at startup and during the five-minute cleanup cycle.
The cleanup cycle can leave an expired file on disk for up to five extra minutes while the server runs.

An explicit player departure deletes that player's photo. Room closure deletes all photos in that room.
A temporary disconnect preserves the photo for a return within the original expiry period.
A server restart preserves unexpired files until expiry, but former rooms and photo access credentials cease to exist.

Photo requests require a connection token and current membership in the photo's room.
Players and the current host or Reactor can view room photos. Tokens stay in memory and expire on disconnect.
The public room directory now requires the existing admin password.

Flask sets `Cache-Control: private, no-store, max-age=0` for photo responses.
The Nginx configuration disables photo caches and photo request logs. Photo URLs contain connection credentials.

## Historical copy

One expired photo was tracked in Git despite the ignore rule for `server/selfies/`.
The current file is deleted. Earlier commits still contain the photo.
These changes do not remove historical copies or photos that a participant previously saved.

## Apply to production

Deploy the server and client changes together.
Apply the updated `deploy/nginx-amogus.conf` configuration.
Restart the backend to activate the access rules and remove expired photos.
Reload Nginx to activate the cache and log rules.
