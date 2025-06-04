# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:ef859f025ed894cd9d0a4065e3b969ba0065c440bd1a833ea5e35cf8751fc2a5

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
