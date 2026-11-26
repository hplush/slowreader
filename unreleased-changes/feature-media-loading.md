# Media Loading Reworked

Telegram photos and videos load in seconds instead of minutes. For this, Telegram shows you online while the app is on the screen. Premium accounts download more files at once.

When you scroll a feed, images load from the place you look at. Telegram, Bluesky, and Mastodon photos show a smaller copy until the full one is saved for offline. When you open the post, its image is not downloaded again. A failed image is tried once more.

After refresh, saving for offline takes images first and videos after them. It skips posts you read during the download, Telegram media you already saw on the page, and files bigger than 100 MB. Instead of failing with “Too many requests”, it waits.
