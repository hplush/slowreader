# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:26f75131a6d302e2bb6165993db45801d9dcb88a97019f826e4d51658f1546b8

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
