# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:b09bc1c6604f0b76097d240bfd2727896c819f2a66c61e72686070fc63423909

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
