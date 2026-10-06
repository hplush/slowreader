# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:a104d1995e56b7a15e8f152078dfbdb1ecbf9f9d1af311e7906e7b4c0c790cf2

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:8000/favicon.ico"]
