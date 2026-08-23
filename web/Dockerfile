# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:b75e46f5101f5248c274ed1153b4fe9d9d3c25b2f4c22c0634d6c7394b25283d

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:8000/favicon.ico"]
