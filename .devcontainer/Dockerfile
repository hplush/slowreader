# Creates development machine inside docker
# so every developer will have the same environment

FROM ubuntu:24.04

ENV NODE_VERSION 22.1.0
ENV PNPM_VERSION 9.1.1

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar xz-utils micro \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
  | tar -xJ -C /usr/local --strip-components=1 \
  --exclude='*.md' --exclude='LICENSE' \
  --exclude='share' --exclude='lib/node_modules/' \
  --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'
RUN curl -fsSL https://github.com/pnpm/pnpm/releases/download/v$PNPM_VERSION/pnpm-linux-x64 > /usr/local/bin/pnpm \
  && chmod a+x /usr/local/bin/pnpm

RUN ls -la /usr/local/bin

RUN userdel -r ubuntu
RUN useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store \
  && pnpm config set ignore-scripts false
RUN echo 'PS1="%d$ "' > ~/.zshrc
