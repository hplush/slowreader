# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:757e2ebf16da21d7bd6aa8470de98b84a5617d792502c79d2e72c4c724027c28

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
