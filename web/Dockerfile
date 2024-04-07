# Web server to serve web client for staging and pull request previews

FROM nginx:alpine
ENV PORT=8080
RUN rm -R /etc/nginx/conf.d
COPY ./nginx.conf /etc/nginx/nginx.template
COPY ./.nginx/route-guard.js /etc/nginx/njs/route-guard.js
COPY ./.nginx/routes.json /etc/nginx/njs/routes.json
COPY ./dist/ /var/www/
CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
