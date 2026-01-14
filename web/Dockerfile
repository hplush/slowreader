# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:c8d973ef4cad186b7285271f97d9699ed235228078f801f13fb2ad2b9cd86afa

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
