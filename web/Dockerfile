FROM nginx:alpine
RUN rm -R /etc/nginx/conf.d
COPY ./nginx.conf /etc/nginx/nginx.template
COPY ./dist/ /var/www/
ENV PORT=8080
CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
