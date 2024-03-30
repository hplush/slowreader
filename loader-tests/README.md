# Slow Reader Loader tests

Integration tests for each social network or news format.

This project allows testing of different types of web feed aggregators on the Internet and provides assurance that our reader can load tests from real feeds.

## Currently supported formats:

- `.opml`
- `.xml`

## Running the tool for OPML files

- Check out [example.opml](./example.opml) for the structure of `.opml` files and testing purposes
- Make sure to start the script from the monorepo root
- Once in the root you can run:

```sh
$ pnpm feed-loader <path_to_your_file.opml>
```
