# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:f49291297a0ef2b4a56ea2051e85e4aeebcbeb9eddf580d787690cce87f2fbd8

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
