# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:51b17a98b6fd1415a10d45bd696d02b84c84e02b90cd8cba63bda3a311ff26bb

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
