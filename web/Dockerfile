# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:9c57995b127b6b131803f9af5575f6dc75e3242f57593d6b8a3a176a28329812

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY --from=ghcr.io/tarampampam/microcheck@sha256:79c187c05bfa67518078bf4db117771942fa8fe107dc79a905861c75ddf28dfa /bin/httpcheck /usr/bin/httpcheck

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:8000/favicon.ico"]
