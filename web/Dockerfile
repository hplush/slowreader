# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:7e68e73713269c4d3d92eb72a9396acfc722290e11676d465b82207dfd22db94

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
