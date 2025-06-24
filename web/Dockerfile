# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:760721eed940cbf1c36a1d7d4d6fa994a1b907116e93bf4fc91cbc3d7451c984

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
