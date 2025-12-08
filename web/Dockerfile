# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:46055d6054b8225c352faae2ea537d5d1e4e36970d62533444975206ed2dc8b3

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
