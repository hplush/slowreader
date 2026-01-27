# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:eed3386a3bb2aaa5f81fdced19548a1bf0f2ecaef222573072a92e7c7e9edd8f

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
