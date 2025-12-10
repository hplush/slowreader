# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:dad6ecc27985d8f09292bb6df5778caa001299af8f486fb023b7efda3d3f3a10

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
