FROM cgr.dev/chainguard/nginx@sha256:61af3191d30e6213ee8cd024e057965649ed0d5555c7b62fac7f31c8919844b2

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Web client assets of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
