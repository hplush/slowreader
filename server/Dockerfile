FROM cgr.dev/chainguard/wolfi-base@sha256:ecc92fadd186235798b617a397724a9c48b7a20ebde6d89865bd01669f837d21 AS base

ENV NODE_VERSION=24.11.1 \
  NODE_CHECKSUM=sha256:60e3b0a8500819514aca603487c254298cd776de0698d3cd08f11dba5b8289a8

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:5e24e436b1d19efb14c9adeee9b340e7a3a3a5501bd2c3986d8c68af14ed3176
WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER nonroot

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "index.ts"]
