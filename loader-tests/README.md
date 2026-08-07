# Slow Reader Loader Tests

Integration tests for each social network or news format.

This project allows testing of different types of web feed aggregators on the Internet and provides assurance that our reader can load tests from real feeds.

## Check Loaders by User’s OPML

Test that Slow Reader can work with all feeds from your RSS reader by using OPML feeds export.

1. Check out [`example.opml`](./example.opml) for the structure of `.opml` file.
2. Once in the root you can run:

   ```sh
   pnpm -F loader-tests check-opml PATH_TO_YOUR_FILE.opml
   ```

## Check Loaders by Different Blog Platforms

Test that Slow Reader can work with different feeds from popular blogging platforms.

```sh
pnpm -F loader-tests test
```

## Debug Feed Search

A small helper to run feed searching for specific feed.

```sh
pnpm -F loader-tests feed URL HOME_URL
```

## Debug Posts Loading

A small helper to run posts loading for specific feed.

```sh
pnpm -F loader-tests url URL
```
