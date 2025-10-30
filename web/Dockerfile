# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:96c146892104607f162e3bd0798f1d323c6cdfc3400d434a8b214a124a8f955b

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
