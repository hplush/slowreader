# Change Log

## 0.20261102.1

_2026-11-02 · +35 −13_

### Security & Privacy

- Fixed sign-in being blocked for everyone after other people mistyped their password.

## 0.20261102.0

_2026-11-02 · +5997 −787_

### Anonymous Statistics

Server shows users count, DAU/MAU, browsers, passkeys, and events statistics by `GET /analytics` (self-hosters can set `ANALYTICS_TOKEN` to enable it).

Apps with a cloud account send anonymous counters of error pages to fix common problems. You can turn it off on the Cloud page. See the [list of events](https://slowreader.app/docs/experiments).

### Post date and feed URL in feed

Add post date and author's handle/URL to post cards in feed.

### Font settings

Change text size, post font, and line spacing on Interface settings page.

Fonts include Literata, Merriweather, Source Serif 4, Bitter, Inter, Atkinson Hyperlegible, Lexend, OpenDyslexic, system font, or any font installed on your device.

### Open feed’s website

Feed popup has a button to open the author’s profile or the feed’s website.

### Extension suggestion

Refresh popup suggests installing the browser extension when sites fail to load through the proxy. Network page tells Safari users there is no extension for their browser.

### Release Notes Feed

New users get Slow Reader release notes in Slow to learn about new features. Delete the feed if you don’t need it.

### Reposted and quoted thread parts

Repost or quote of a post from the middle of a thread shows its position, like `5/30`. Opening the repost shows the whole thread from the start.

### Share posts

Post popup and post cards in feed have a “Share with” button to send the post link to another app.

### Fonts for more languages

Arabic, Hebrew, Indian, Southeast Asian, African, Native American and other writing systems now use Noto Sans, even with a custom post font. The app downloads a font only when a page has text in its writing system.

### Security & Privacy

- OPML import uses HTTPS for feeds with `http://` links when the site supports it.
- Another website opened in your browser can no longer connect to Slow Reader server with your login and read or change your feeds.

### Fixes

- About page now prefills debug info in “Report an issue”.
- Fixed UX of Add Feed page by move focus to URL to save one click.
- Error pages now offer an update if a new version is out, a reload, or a “Report an issue” button with the error, browser, and app version prefilled.
- Delete feed button shows a loader while unfollowing on the service.
- Disabled buttons look faded.
- Changed Fun post life duration default options. Also settings allows any custom value.
- Long category names no longer break feed type switch and category list layout.
- Fixed refresh error “too many SQL variables” on feeds with many new posts.
- Slightly smaller text on big phones.
- Fixed monospace font not being applied to code.
- Night lock now ends at 4:00 by default.
- Show app crash page instead of “Browser can not save the data” when the database failed because of the app’s bug.
- Fixed support for Pleroma and Akkoma servers in Mastodon.
- Fixed closing popup on click on its post or item in the list.
- Fixed post from the list opening over old popups instead of replacing them.
- Hide proxy file size limit errors from refresh popup.
- Speed up post refreshing by processing images in parallel.
- Navbar refresh progress now shows posts and images downloading in different colors.
- Feed with server error is retried after all other feeds, giving server time to recover.
- Show loader on “Update app” button while the new version is starting.
- Hide “Enough scrolling” button when Useful has no unread posts.
- Pause video when you scroll it out of the screen.

## 0.20261027.1

_2026-10-27 · +4 −3_

### Fixes

- Fixed the release build broken by the changed lines counter in release notes.

## 0.20261027.0

_2026-10-27 · +6627 −1786_

### Account re-sign-in

When the sign in to a social account expires, Accounts page marks this account, and its popup has a button to sign in again. The refresh error opens this popup.

### Hint to Useful in Fast

Promote Useful when you read 2+ Fun pages.

### Website Visit Counter

Home, docs, and release notes pages count visits with own Plausible without cookies. The app still has no analytics.

### Night Fun Lock

New Coach settings page can lock Fun at night to read more slow useful content instead of scrolling before going to bed.

Solve a math task to open each Fun page or to change the lock.

### Mastodon Polls

Posts show poll options and a link to vote on your Mastodon server.

### Post language

Posts get language from Mastodon, Bluesky, RSS, Atom, and JSON Feed, so browser picks the right fonts, hyphenation, and screen reader voice.

### Pagination by Reading

Useful shows page numbers in both list and feed UIs. Fun shows back and next buttons in both UIs.

### RSS 1.0 Support

Slow Reader now can subscribe to RSS 1.0 (RDF) feeds, which are still popular on Japanese and academic websites.

### Install suggestion

Safari deletes feeds and posts after 7 days without visits. We warn about it on Welcome screen and suggest installing the app or created cloud account.

### Settings Sync

Fun posts lifetime, night lock, content warnings and sensitive media settings are now the same on all your devices.

### Security & Privacy

- Server and proxy run with Node.js permissions, so a malicious dependency can’t read other files, write files, or start processes.
- Releases now have SBOM with all packages, and release notes list CVEs fixed by dependency updates.
- Client database runs on our own small driver instead of SQLocal: 2 fewer dependencies and no code which could start workers from `data:` URLs.

### Fixes

- Added changelog section and a link with latest changes to About page.
- Added feed avatars to Add page.
- Made text a little thinner in dark theme, because light text on dark background looks bolder.
- Fixed refresh error on cloud sync when feed has the same post twice.
- Fixed Mastodon and Bluesky accounts with the browser extension.
- Fixed highlighted post in the recent posts of the feed popup.
- Fixed useless Anonymous account in feed popup for RSS, Atom, and JSON Feed, and added feed type to Feed URL label.
- Added a placeholder for avatars and images while they are loading, and an icon for images which failed to load.
- Fixed Mastodon post links to open the post on your own server, where you can reply, repost or like.
- Open `@user` links from Bluesky and Mastodon posts in the feed popup instead of a new browser tab.
- Add more docs to website: Releases and Branding.
- Fixed losing changes from a newer app version on devices, which were not updated yet.
- Fixed Update button on outdated client page reloading the same old version.
- Removed “Open post link” from quotes.
- Fixed duplicate posts after refresh on another device with cloud sync.
- Fixed Mastodon and Bluesky avatars to be round like in social networks.
- Fixed RSS posts with empty `<guid>` being skipped.
- Added fire animation on touching slow mode button on phones and tablets.
- Fixed broken images, which were not saved for offline.
- Fixed empty feed title in the feed popup after unsubscribing.
- Removed second click on blurred media after showing post with content warning.

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
