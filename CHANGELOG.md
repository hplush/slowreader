# Change Log

## 0.20261119.1

_2026-11-20 · +12 −1_

### Fixes

- Fixed “This User ID is already taken” error on creating a cloud account after the demo.

## 0.20261119.0

_2026-11-19 · +7181 −1346_

### Categories page

_By category_ page is now _Categories_. It shows only the list of categories with the number of feeds in each, and a click on a category opens its feeds.

### Copy post URL

Browsers without the share menu show a button to copy the post’s URL instead of the Share button.

### Dead feeds

New _Dead feeds_ page in the feeds menu lists feeds, which were deleted from their sites, and feeds without posts for 1 or 2 years, so you can clean up your subscriptions. The refresh popup suggests opening it when many feeds became dead since your last visit.

### Reading colors in feed lists

Feeds in _Categories_ and _Dead feeds_ lists show their reading by color: Useful feeds are yellow, Fun feeds are neutral.

### Back button on mobile

On phones and tablets, the navbar shows the Back button instead of Refresh in feed’s posts and on settings pages.

### Refresh every 15 minutes

Auto-refresh now checks feeds for new posts every 15 minutes while the app is open, even in the background, so you will see new posts when you come back. It follows the same Network setting as auto-refresh on start and is skipped in Save Data mode.

### Stop video loading

Telegram video shows a stop button while it is loading. Video, which was loaded after scrolling, does not play out of the screen.

### Category feed in Useful

Click on a category in the Useful menu opens all its posts as one feed. The arrow near the category name hides and shows its feeds.

### Video autoplay

Video starts without sound when you scroll to it. Nothing covers it: buttons appear when you move the mouse over the video, and a tap pauses it. If a few videos are on the screen, only the upper one plays, and the next one starts when it ends. Any video, started by you too, stops when you scroll it away or start another one. In Posts settings you can allow it only on Wi-Fi or turn it off. Save Data mode turns it off too.

### Telegram video streaming

Telegram video starts right after the click instead of waiting for the whole file, and only the watched part is downloaded. Autoplay works for big videos too.

### Security & Privacy

- CI checks nginx and system libraries of the image for vulnerabilities every day, and SBOM lists them and the health check tool.
- Updated nginx to 1.31.9 to fix CVE-2026-113425, CVE-2026-118899, CVE-2026-120967, CVE-2026-120993, CVE-2026-121810, CVE-2026-123007, CVE-2026-123633, CVE-2026-123634, CVE-2026-123640, CVE-2026-125283.
- System libraries for Node.js in the image are updated together with base images.

### Fixes

- Feed preview shows last post date instead of posts frequency for feeds without posts for 6 months, warns about feeds without posts for a year, and marks it red after 2 years.
- Showed feed type for every result in Add feed.
- Bluesky account no longer asks to sign in again after the daily check of your follows.
- Fixed “Delete local data” on the error page: it now also downloads the app files again, in case they were the reason of the error.
- Fixed “Download new posts” button not reacting to the click for a few seconds.
- Renamed feed popup buttons to “Follow” and “Unfollow”.
- Thread marker like `1/3` is shown right after the post text, and `…` of the cut post looks the same as the marker.
- Fixed the app crash on every start after the app was closed during an update.
- Fixed error text in refresh for feeds, whose domain does not exist anymore.
- Explained on Network settings why mobile app uses only proxy.
- Fixed empty error for Telegram channels in refresh after the app release: now it asks to update the app.
- Link preview card of a Telegram, Bluesky, or Mastodon post now opens it in the app, like a link from the text.
- Fixed broken feed type field on narrow screens with bigger font.
- Fixed “You read all” message staying after refresh downloaded new posts.
- Fixed loader disappearing before the feed is closed after “Mark as read”.
- Fixed refresh stopping without new posts, freezing, or showing another device’s refresh forever after the connection to the cloud was lost, like on return to the app on a phone.
- Fixed auto-refresh on app start being skipped or freezing at “Asking other devices to wait…”.
- Fixed media saving progress appearing in the refresh popup only after the posts check.
- Fixed “Check for new posts” button opening a popup instead of just checking for new posts.
- Refresh popup shows what the app is waiting for before checking feeds instead of 0/0.
- Reposts show the original author’s avatar instead of the reposter’s one and do not repeat the reposter’s name.
- Fixed empty posts list in the popup of a saved feed: Telegram channel is found after its username change, and a broken feed shows the error.
- Opened spoiler keeps its background, hides again by click, and is opened from the start with “Open content warnings” setting.
- Fixed sync status hiding the last feed in a long menu.
- Media of posts, refreshed on another device, is now saved for offline too.
- Fixed loading order of Telegram images: images on the screen are loaded first, and images of a closed page do not delay the next one.
- Fixed `Chat not found` error on refresh after leaving Telegram channel in Telegram app.
- Fixed paid Telegram posts shown as unsupported: now they have a link to open them in the app.
- Fixed slow Telegram feed popup and images during the refresh.
- Fixed “Request aborted” errors in refresh, when Telegram answers longer than a minute.
- Telegram round videos are shown as circles, like in Telegram.
- Text size setting maximum is now 150% on desktop too.
- Render Useful feeds as feed of posts instead of list of title since list can confuse new user
- Fixed blurred preview under the play button of Telegram video.
- Fixed missing buttons to add feeds on the welcome page after removing the demo.
- Fixed missing hint on how to reset the app on the welcome page.
- Fixed adding WordPress authors by fediverse handle as Mastodon feed.

## 0.20261114.0

_2026-11-14 · +21186 −3235_

### Accounts Useful by default

Now you can choose account to mark its authors as Useful by default and render them as separated feeds in Useful menu.

Every Mastodon hashtag you follow will be rendered as feed too in menu.

Also Feeds by Category now will contain accounts's feeds for both Useful and Fun accounts.

### Moved Feeds

Feed keeps its posts and settings when the author moves it:

- Bluesky: new handle.
- Mastodon: move to another server.
- RSS, Atom, and JSON Feed: permanent redirect to the new URL for 3 days.

### Blurred Media Preview

Mastodon & Telegram images and videos show a blurred preview while they load, and behind the load button in Save Data mode. The preview anyway comes with the post, so it needs no extra request.

### Metrics

Self-hosters can read usage metrics in Prometheus format by `GET /metrics` with `ANALYTICS_TOKEN`. It replaces `GET /analytics`, and `ANALYTICS_IPS` was removed. Old daily statistics are removed from the database.

### Multi-Tab Support

The app now works in several browser tabs at once in every browser, including Safari, which showed the “No multi-tab” error before. Tabs share one database, so they no longer crash or show “database is locked” errors.

### Posts settings

New Posts page in settings with content warnings, sensitive media, and a new option to keep trackers in RSS and Atom posts.

### One Device Checks for New Posts

Only one device or tab checks for new posts at a time. Others show that another device is checking.

### Save Data mode

In this mode, images load only when you click them. Feeds don't refresh on start, media isn't saved for offline, feed icons don't update, and the app doesn't check for updates on start: use Check updates on the About page.

New Save Data setting on the Network page. It follows the system setting by default, or you can turn it on only for cellular networks.

### Feed view for social feeds

Telegram, Mastodon, and Bluesky feeds in Useful now open in feed view by default, since their posts have no titles for the list. You can still switch a feed back to the list. Opening a post from feed view in Useful marks it as read, like in the list.

### Telegram Channels

Add your Telegram account on the Accounts page to read its channels here:

- Every channel you follow becomes a feed. Subscribing to a `t.me` link joins the channel, deleting the feed leaves it.
- Posts keep formatting, photos, videos, polls, forwards, replies, and link previews.
- Posts with rich formatting keep headings, lists, quotes, tables, and photos between paragraphs.
- Hidden text (spoiler) stays covered until you click it.
- Read posts are synced with Telegram both ways.
- You sign in on every device, since the sign-in key never leaves the device. Refresh shows an error on a device without the sign-in.
- On a computer you sign in by scanning a QR code in Telegram’s app, without a phone number and a code.
- Posts of channels, which forbid copying, can’t be copied, saved, or exported.
- Sponsored messages are shown under a channel, as Telegram requires.
- Add page asks to add the account, if you open a `t.me` link without it.
- Welcome page has buttons to add Bluesky, Telegram, or Mastodon account right away.
- Link to a user, bot, or group tells that only channels are supported, and offers to open it in the browser.

Self-hosters need their own app ID in `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`.

### Reading Time

App now tracks locally how much time you spent in Useful and Fun during the last 24 hours and render this data for user on Coach page.

A small slider under Useful/Fun switcher shows the balance between them. You can hide it on Coach page.

The “Enough scrolling” button in Fun is shown only if you spent less than 75% of your reading time in Useful during the last 24 hours. It is also hidden if you read Useful for more than 5 minutes during the last 10 minutes.

You can disable reading time tracking on all your devices on Coach page.

Coach page explains how each feature helps you.

The “Enough scrolling” button in Fun can be disabled on Coach page.

### Security & Privacy

- Link to the app itself in post’s text can’t open app’s popups with post’s own data.
- Benchmark mode starts only on local and staging servers, so a link can’t replace user’s account with the test one.
- Production server deploys only images, which our verifier checked.
- DNS records of `slowreader.app` are signed by DNSSEC.
- Production server reboots at night after a security update, since Livepatch doesn’t fix every kernel vulnerability.
- CI checks Node.js for security releases by our own script instead of a third-party npm package with many nested dependencies.
- Telegram’s library is our own build from pinned sources and runs in a separate worker, which can connect only to our domain and Telegram’s servers.
- Updated Node.js to 26.13.1 to fix CVE-2026-123828, CVE-2026-123829, CVE-2026-123862, CVE-2026-123863, CVE-2026-123864, CVE-2026-123865, CVE-2026-123866, CVE-2026-123867, CVE-2026-123868, CVE-2026-123871, CVE-2026-123872, CVE-2026-123873, CVE-2026-123874, CVE-2026-123875, CVE-2026-123877, CVE-2026-126051.

### Fixes

- Fixed deleted account staying in the list for seconds without any loader while its posts are deleted.
- New feed, which you follow by an account, now uses the account’s category and Useful or Fun type instead of General and Useful.
- Accounts page shows handle and service name instead of display name.
- Fixed Add page crash on a feed address, which redirects to another one.
- Fixed missing profile handle of Mastodon and Bluesky authors in account’s timeline, reposts, and quotes, and for authors from any Mastodon server.
- Fixed loader jump inside a pressed button.
- Feeds from OPML import and the demo get their icons right away.
- Fixed feed/list switch in General category.
- Fixed server restarting every 10 minutes and dropping connections.
- Fixed menu scroll position on mobile after returning from a feed.
- Show “Migrating local database” instead of “Loading local data” after the app update.
- Fixed scroll jump on clicking More posts in feed popup.
- Night lock unlocks as soon as you type the right answer, without pressing Enter.
- Fixed error in Pleroma and Akkoma feeds with reposts, where the server hides the author.
- Fixed opening replies, quotes, and links to Pleroma and Akkoma posts inside the app.
- Fixed feed added without posts after closing the feed popup before subscribing finished.
- Fixed tapping a handle in a post in the installed app on Android opening the browser together with the feed.
- Fixed slow switch between feed and list views, especially in Firefox.
- Fixed already read posts appearing again in feeds.
- Fixed feeds being checked twice, when refresh was stopped and started again.
- Fixed too frequent refresh: the app refreshes feeds on return only after 30 minutes away, not 5.
- Fixed too sharp corners of slider line in Chrome.
- Fixed endless loading on the app update button.
- Fixed content warning button jumping to the next line with bigger text size.

## 0.20261105.0

_2026-11-05 · +1430 −432_

### Auto-Refresh

Network settings has an option to refresh feeds on app start and on return to the app after 5 minutes.

### Feed Posts Frequency

Feed popup shows how often the feed posts and warns about too frequent feeds. Refresh loads frequent feeds first.

### Metrics

Self-hosters can read usage metrics in Prometheus format by `GET /metrics` with `ANALYTICS_TOKEN`. It replaces `GET /analytics`, and `ANALYTICS_IPS` was removed. Old daily statistics are removed from the database.

### Fixes

- Improved contrast of red text in dark theme.
- Fixed feed support with future dates, like in events feeds.
- Fix inline code backgrounds merging between lines in posts.
- Fix long category name overflowing the feeds by category page.
- Hide text sizes above 150% on mobile since they break UI.
- Make headings inside posts smaller than the post title.
- Fixed focus outline on select after tapping it on Android.
- Center titles on About, Import, and error pages.

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
