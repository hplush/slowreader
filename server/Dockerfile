FROM cgr.dev/chainguard/wolfi-base@sha256:9925d3017788558fa8f27e8bb160b791e56202b60c91fbcc5c867de3175986c8 AS base

ENV NODE_VERSION=24.13.1 \
  NODE_CHECKSUM=sha256:30215f90ea3cd04dfbc06e762c021393fa173a1d392974298bbc871a8e461089

ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz /node.tar.xz
RUN tar -xf "node.tar.xz" --strip-components=1 -C /usr/local/ \
  "node-v${NODE_VERSION}-linux-x64/bin/node"
RUN apk add --no-cache binutils
RUN strip /usr/local/bin/node

FROM cgr.dev/chainguard/glibc-dynamic@sha256:32e4a9556c591d7a6bfcaf4712d102a943c921c3674a3d07673c8d7cd2e18456
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
