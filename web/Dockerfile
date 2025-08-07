# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:126d32915d15cae70dc9ca930216f4cebdb19e775f8f715b98ba0ac187d74766

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
