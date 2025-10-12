# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:0907e75d6d76e1e065cb9a9aa55d3badea720f54c80f1170f0002d28d0ab0d5e

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
