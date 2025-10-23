# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:f97ca53d7a1702a36c40976fa2319d1a248bfdb53d3acb35c23014f35c05114c

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
