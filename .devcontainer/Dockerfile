# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.14.0
ENV PNPM_VERSION 10.7.0

ENV NODE_CHECKSUM_ARM64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_ARM64 68916f9fadde7cfea9eced8d88f3a2159d181b1fe5a1e405a71434fc05643405
ENV NODE_CHECKSUM_X64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_X64 d1e8009b1ac8c54050efd969d4b6a96eae4fdc3e1ed138741eaf5699a85a16cf

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
  build-essential python3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.63.0/difft-x86_64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=ef4c020d919cd8e1b5d6a69ead14ee6846ba3c4cadda5bac7ef63b1a09b27535
    export ARCH="x64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.63.0/difft-aarch64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=14db971709cb2fb5af283bcf2bb4db031026896bca9dc13932b50a3aac7de928
    export ARCH="arm64"
  else
    echo "Unsupported architecture: $TARGETARCH"
    exit 1
  fi

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" \
    --fail --show-error --location --silent --output /node.tar.xz
  echo "$NODE_CHECKSUM /node.tar.xz" | sha256sum -c
  tar -xf /node.tar.xz -C /usr/local --remove-files --strip-components=1 \
    --exclude='*.md' --exclude='LICENSE' \
    --exclude='share' --exclude='lib/node_modules/' \
    --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c
  chmod a+rx /usr/local/bin/pnpm

  curl "${DIFFT_URL}" \
    --fail --show-error --location --silent --output /difft.tar.gz
  echo "$DIFFT_CHECKSUM /difft.tar.gz" | sha256sum -c
  tar -xz -f /difft.tar.gz -C /usr/local/bin --remove-files
EOF

RUN userdel -r ubuntu && useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
