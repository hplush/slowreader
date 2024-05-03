FROM node:22.1.0-alpine

ENV NODE_ENV production
WORKDIR /var/www
COPY --chown=node:node . /var/www

COPY ./dist/ /var/www/

CMD "node" "--enable-source-maps" "index.mjs"
