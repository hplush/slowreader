FROM registry.access.redhat.com/ubi9/ubi:9.4 as builder

ENV NODE_VERSION=22.2.0
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz \
  | tar -xz -C /usr/local/ --strip-components=1

FROM registry.access.redhat.com/ubi9/ubi-micro:9.4

COPY --from=builder /usr/local/bin/node /usr/bin/node
COPY --from=builder /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6

ENV NODE_ENV production
WORKDIR /var/www
COPY ./dist/ /var/www/

USER 1000:1000

CMD "node" "--enable-source-maps" "index.mjs"
