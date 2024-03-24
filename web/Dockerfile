FROM nginx:alpine
ENV PORT=8080
RUN rm -R /etc/nginx/conf.d
COPY ./nginx.conf /etc/nginx/nginx.template
COPY ./dist/ /var/www/
CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
