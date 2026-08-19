# registry.access.redhat.com/hi/nodejs:26.7.0
FROM registry.access.redhat.com/hi/nodejs@sha256:f2e9cae41e627056081ffb93277760bc300cec3b12863cebc42893257e3bbd7e

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Proxy server of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

WORKDIR /var/app
ENV NODE_ENV=production \
  PORT=5284

COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./dist/ /var/app/

USER 65532

ENTRYPOINT ["/usr/bin/node"]
CMD ["server.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:5284/health"]
