# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:da5e1bdcfdb0572b77bbf2ee9680b3a9c68f3987dc1198219c4fd3d95f536426

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
