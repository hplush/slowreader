# Web server to serve web client for staging and pull request previews

FROM cgr.dev/chainguard/nginx@sha256:816d865f2888f57d68928fc61049924ddd81523c1a0d1762fb2724f5eca6873e

COPY ./nginx.conf.compiled /etc/nginx/nginx.conf
COPY ./dist/ /var/www/
