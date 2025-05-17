# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:2ad583ef111c4e9deb1e355b0ced3246b249812a0525167a28cccc612507733d

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
