# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:50b986b188c26457d060c9e16665b51d2e5e252019ba4e921cb990c71cd24802

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
