# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:ec5ae753ef9f280442856fd974831a4017dbff500b6f2cdc6b0854cafedcead9

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
