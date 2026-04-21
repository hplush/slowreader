# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:2ce17f21e8f27635a53956609e27257b0a2d5bec233f800dd1f3d4b8757dd5fe

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY --from=ghcr.io/tarampampam/microcheck@sha256:39bfe96f6c14e715bd5ef44d2b3c3425700adf37e3a39f7a9c0560421df2d19b /bin/httpcheck /usr/bin/httpcheck

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:8000/favicon.ico"]
