# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:2d770db928ae2395c72e4c6e6e0e38ffb8313d9aa15fc8ce6fc70043db52a180

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
