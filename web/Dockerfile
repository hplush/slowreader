# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:210272eb68fbc6c698930ff5616d65da53890d085f3ef65a5bf310cb4984802d

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
