# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:a9366cea5217f1daf7b6f21e997aa844aef691767f95865f243570a44f13f34b

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
