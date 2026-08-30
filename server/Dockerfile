# registry.access.redhat.com/hi/nodejs:26.7.0
FROM registry.access.redhat.com/hi/nodejs@sha256:53f84ae5ef2d76305bd4eba4517594a3fc3128db018c9a2f0d393c107a9d0e81

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

WORKDIR /var/app
ENV NODE_ENV=production \
  LOGUX_HOST=0.0.0.0 \
  LOGUX_LOGGER=json \
  PORT=2554

COPY --from=ghcr.io/tarampampam/microcheck@sha256:c9f79cd408626de7c10f2d487d67339f49adf0ba61dde96ede65343269db1f85 /bin/httpcheck /usr/bin/httpcheck

COPY ./dist/ /var/app/
COPY ./web/ /var/web/

USER 65532

ENTRYPOINT ["/usr/bin/node"]
CMD ["index.ts"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/bin/httpcheck", "http://localhost:2554/health"]
