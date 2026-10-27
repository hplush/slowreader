# Change Log

## 0.20261022.3

_2026-10-22 · +35 −32_

### Fixes

- Fixed checking the service worker file in the browser version of the verifier.

## 0.20261022.2

_2026-10-22 · +108 −62_

### Fixes

- Fixed ARM64 Docker image build.

## 0.20261022.1

_2026-10-22 · +11 −8_

### Fixes

- Use less memory when building Docker images.

## 0.20261022.0

_2026-10-22 · +20075 −2446_

### Accounts

Sign in to Mastodon or Bluesky account on the new Accounts page in settings. Tokens stay only on your devices.

Refresh loads home timeline of the account into Fun posts of account’s category. Click on author to change its feed type, category, or name. The new Account field follows and unfollows authors on the service.

### ARM64 Image Support

Self-hosters can now build and run the Docker image on ARM64 devices, like Raspberry Pi.

### Bluesky

Add Bluesky profile by its URL, custom domain like `user.com`, or `@user.bsky.social` handle to read its posts with reposts, quotes, threads, link previews, GIFs, videos, and hidden sensitive media.

### Fast posts cleaning

Old fast posts are deleted before the refresh. Choose to keep them for 1 week, 1 month, or forever in Storage settings.

### Feed icons

Feeds now have icons, so it’s easier to find them in the menu and in the preview before subscribing.

### Feed preview cards

Feed preview before subscribing now shows posts as cards with text and images, like the feed reader.

### Mastodon

Add Mastodon profile by its URL or `@user@server` handle to read its posts with reposts, threads, quotes, link previews, custom emoji, content warnings, and hidden sensitive media.

Interface settings can open warnings and show sensitive media by default.

### Offline Media

Refresh saves images and videos of unread posts, so you can read them without network. In _Network_ settings on every device, choose posts to save media of (_All_, _Useful_, or _None_) and _Always_, _Wi-Fi_, or _Never_ for images and videos. _Storage_ settings show the size of saved media and can clear it.

### Offline start

The app starts without network. You can read downloaded posts offline.

### Update check

About page now checks for a new app version and shows `Update app` button only when an update is available. It works in a browser tab too, not only in the installed app.

### Fixes

- Android navigation bar in installed app now follows dark mode.
- Fixed importing backups from other app versions, which could break the data: now the import shows an error.
- Link to an opened post keeps working after Slow Reader deleted the read post: it loads the post from the network.
- Fixed leave page warning on opening a link in system browser from PWA.
- Better “More posts” loading UX in the feed preview.
- Fixed low contrast of links and wrong text color in popups in light theme, especially in Firefox with dark system theme.
- Fixed a feed moved to another category disappearing from the menu after an app update.
- Fixed the error page with “No Slow Reader database” on opening a link to categories, storage settings, a post, or a feed preview.
- Fixed closed popups behaviour on Add feed page.
- Fixed post truncat in the list view gluing paragraphs together and cutting text inside links.
- Better proxy processing when a client cancels the response body.
- Prevented the server process from replacing its own code in the Docker image.
- Fixed missing images in posts with summary.
- Fixed posts without a date in the feed showing a date far in the future and staying at the top of the reader.

## 0.20261013.3

_2026-10-13 · +1242 −6_

### Fixes

- Added server verification status link to About page and landing.
- Allowed status pages on other websites to check `slowreader.app` files from the browser.

## 0.20261013.2

_2026-10-13 · +119 −62_

### Fixes

- Fixed missing app icon in browser tab.
- Added link to Docker image to every GitHub Release.

## 0.20261013.1

_2026-10-13 · +206 −52_

### Fixes

- Fix release script.

## 0.20261013.0

_2026-10-13_

Initial release.
