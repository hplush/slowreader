# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:fbaffc2f232b890c30d29a803dd8646fca30e28b795abc6314e9bf8f5894aadd

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
