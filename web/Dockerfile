# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:5c89cba9db483e4649908db2a2f7f2be7735926bcc6dec35592bca7734617d1c

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
