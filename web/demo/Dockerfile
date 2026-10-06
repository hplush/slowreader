# Time-sensitive files (demo database, landing screenshots, and OG image).
# demo-db.yml builds them separately and the main Dockerfile pins this image
# by digest to keep the main image build reproducible.

FROM scratch

LABEL org.opencontainers.image.source=https://github.com/hplush/slowreader
LABEL org.opencontainers.image.description="Demo database and screenshots of Slow Reader"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later

COPY web/public/demo.json web/public/demo.sqlite landings/dist/og.jpg /
COPY landings/screenshots/ /screenshots/
