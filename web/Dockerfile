# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:ea2e7adbb26213187c953805975fa53856d9b794f43bf0357ead46c847b9c43c

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
