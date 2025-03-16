# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.14.0
ENV PNPM_VERSION 10.6.5

ENV NODE_CHECKSUM_ARM64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_ARM64 9b9d1d3f026f969b33596dbf6c46f31a8078f0fce412231b2093d7e6a36aaa5c
ENV NODE_CHECKSUM_X64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_X64 75a7f1c70d3ce7ff7f6f0a0815010246ff14142418f66126a2c2be83a65f284d

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
    build-essential python3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.62.0/difft-x86_64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=bf546299085abd497dce115739bc00370d0c0386030e43f14fe137ef3a5f773b
    export ARCH="x64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.62.0/difft-aarch64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=3b5e935561dfc9656309c29f0a2aa57cf96592f76c03da52db166d3a73e161e2
    export ARCH="arm64"
  else
    echo "Unsupported architecture: $TARGETARCH"
    exit 1
  fi

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" \
    --fail --show-error --location --silent --output /node.tar.xz
  echo "$NODE_CHECKSUM /node.tar.xz" | sha256sum -c

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c

  curl "${DIFFT_URL}" \
    --fail --show-error --location --silent --output /difft.tar.gz
  echo "$DIFFT_CHECKSUM /difft.tar.gz" | sha256sum -c

  tar -xz -f /node.tar.xz -C /usr/local --remove-files --strip-components=1 \
    --exclude='*.md' --exclude='LICENSE' \
    --exclude='share' --exclude='lib/node_modules/' \
    --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'
  tar -xz -f /difft.tar.xz -C /usr/local/bin --remove-files

  chmod a+rx /usr/local/bin/pnpm
EOF

RUN userdel -r ubuntu && useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
