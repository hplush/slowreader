# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:3ca109067f1a23650b9496fe5c28f76c0b59bfd1fa97f34a9431e525459d6095

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
