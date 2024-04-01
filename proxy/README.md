# Slow Reader Proxy

HTTP-server to proxy all RSS fetching request from web client.

User could use it to bypass censorship or to try web client before they install upcoming extension (to bypass CORS limit of web app).

## Usage

### Start proxy

```shell
pnpm start
# // Proxy server running on port 5284
```

### Make a request

```shell
curl localhost:5284/https://hplush.dev
```
