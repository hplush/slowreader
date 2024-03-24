FROM nginx:alpine
RUN rm -R /etc/nginx/conf.d
COPY ./nginx.conf /etc/nginx/nginx.template
ENV PORT=8080
COPY ./dist/ /var/www/
CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
