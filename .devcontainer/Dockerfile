# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ENV NODE_VERSION 22.6.0
ENV PNPM_VERSION 9.6.0
ENV NODE_CHECKSUM sha256:f2f4ccbcbc0a443e5fadebd1149a22f96087ec09cef52ff343a15ee835206d96
ENV PNPM_CHECKSUM sha256:efdfcefb089b01dafa98c4c3fa47f544046d0e4de67055a69b0563875de83175

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1 \
  --exclude='*.md' --exclude='LICENSE' \
  --exclude='share' --exclude='lib/node_modules/' \
  --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'
ADD --checksum=$PNPM_CHECKSUM https://github.com/pnpm/pnpm/releases/download/v$PNPM_VERSION/pnpm-linux-x64 /usr/local/bin/pnpm
RUN chmod a+rx /usr/local/bin/pnpm

RUN userdel -r ubuntu && useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store \
  && pnpm config set ignore-scripts false
RUN echo 'PS1="%d$ "' > ~/.zshrc
