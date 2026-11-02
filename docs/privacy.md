# Privacy Policy

## Your Data

Slow Reader is a local-first app. Your feeds, posts, and settings live on your device. You can use the app without an account.

## Cloud

If you create a cloud account to sync your devices, the app encrypts your data on your device before sending it to our server. Only your devices have the key, so we can’t read your data.

The app gives you a random user ID instead of asking for your email or name.

The server needs some data unencrypted to sync your devices. This is all the unencrypted data it has:

- the random user ID;
- a hash of your password;
- your encryption key, encrypted so only you can use it;
- your passkeys’ public keys, names, and when you used them;
- random IDs of your devices;
- your devices’ browser and OS names and last use, so you can sign out a lost device;
- when you created the account;
- when, from which device, and how much encrypted data your devices send.

Sync can’t work without this data, so there is no way to have a cloud account with less data.

We keep this data until you delete it. The _Delete your data from the cloud_ button on the _Cloud_ page deletes all of it immediately. Daily database backups keep a copy for 7 more days. Deleting your account doesn’t change daily totals already saved, because they don’t contain your data.

## Loading Feeds

Without the Slow Reader browser extension, the web app downloads feeds through our proxy, because browsers block direct requests to other websites. The proxy doesn’t record which feeds you read.

With the extension, the app downloads feeds directly, so feed websites see your IP address.

## Analytics

We have two separate counters. Neither can link data to you. The only cookie keeps you signed in to the cloud.

- **App:** our server counts active cloud accounts, their browsers, passkeys, and <a href="/docs/experiments">error pages</a>. It saves only daily totals without user IDs or IP addresses. Users without a cloud account don’t send error counts, and you can turn them off on the _Cloud_ page.
- **Home page and docs:** our own copy of <a href="https://plausible.io/data-policy" target="_blank">Plausible</a> counts visits. It sets no cookies, doesn’t save your IP address, and can’t connect your visits on different days.

## Logs

Our logs don’t have your IP address or data, only your random user ID and device IDs.

## Hosting

Our servers and database run at Scaleway in Paris, France. Database backups are stored in another Scaleway data center in the EU. You can read <a href="https://www.scaleway.com/en/privacy-policy/" target="_blank">Scaleway’s privacy policy</a>.

The test version at `dev.slowreader.app` and visit counter at `lens.hplush.dev` run at Hetzner in the EU. You can read <a href="https://www.hetzner.com/legal/privacy-policy/" target="_blank">Hetzner’s privacy policy</a>.

## Your Rights

You can access, export, and delete your data in the app:

- _Export_ page saves your feeds, posts, and settings to a file.
- _Download server data_ button on the _Cloud_ page saves everything our server has about your account.
- _Cloud_ page shows your devices and passkeys and lets you remove them.
- _Delete your data from the cloud_ button on the _Cloud_ page deletes your cloud account.

We don’t know who you are, so we can’t confirm your identity by email. If you lose your password and all passkeys, we can’t give you access to the account or its data.

For questions, email [andrey@sitnik.es](mailto:andrey@sitnik.es). We answer within one month. You can also complain to your local data protection authority.

## Contact

Slow Reader is run by <a href="https://github.com/ai" target="_blank">Andrey Sitnik</a> in Spain. For questions or comments about privacy, you can contact us at [andrey@sitnik.es](mailto:andrey@sitnik.es).

If you email us, we use your email address and message only to answer you. We delete them when you ask us. Our email runs on Google Workspace, so Google stores it in the US.

## Changes

We may change this policy at any time. Check this page for the latest version. Last change: November 2, 2026. See <a href="https://github.com/hplush/slowreader/commits/main/docs/privacy.md" target="_blank">the history of changes</a> of this policy.
