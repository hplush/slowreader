# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:dc854e6b4d81d2a5fa2d04cb84320864576f9a07918534339638427c4563b91c

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
