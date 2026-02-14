# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:61af3191d30e6213ee8cd024e057965649ed0d5555c7b62fac7f31c8919844b2

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
