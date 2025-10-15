# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:5fa81f9bb380cd7703432bf8c7f0cfa053539eb482a754675ea23b6f6ed4bab0

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
