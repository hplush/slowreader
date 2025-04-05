# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:40d3b4b7a4614d42ecb9d43675e31e46a676653f52dd7e246804cfbbe6c4ea0c

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
