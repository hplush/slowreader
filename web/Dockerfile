# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:b446ac2b6c56051bc2dc23b02b5dfe1c5773ad088f83c12c58b4f28fa251a36f

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
