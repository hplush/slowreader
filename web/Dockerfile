# Web server to serve web client for staging and pull request previews

FROM docker.io/nginx:1.27.4-alpine3.21

ENV PORT=8080

RUN rm -R /etc/nginx/conf.d
COPY ./nginx.conf /etc/nginx/nginx.template
COPY ./routes.regexp /etc/nginx/routes.regexp
RUN awk 'NR==FNR{a=$0;next} {gsub("__ROUTES__", a)}1' /etc/nginx/routes.regexp /etc/nginx/nginx.template > /etc/nginx/filled.template
RUN mv /etc/nginx/filled.template /etc/nginx/nginx.template

COPY ./dist/ /var/www/

CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
