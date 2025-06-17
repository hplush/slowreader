# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx:latest@sha256:eca342fb593c1e805eb957367f3fdc9ed32e275b3f89cb4b3504e691da44224b

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
