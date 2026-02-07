# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:17f2bec74555f5602eb6c562a8587800d1e31c379082e6123adac08fe41c037a

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
