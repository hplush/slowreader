FROM node:22.14.0-alpine

ENV NODE_ENV production
ENV LOGUX_HOST 0.0.0.0
ENV LOGUX_LOGGER json
WORKDIR /var/app
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER 1000:1000

CMD "node" "--import" "tsx" "index.ts"
