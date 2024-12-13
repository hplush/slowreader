# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.11.0
ENV PNPM_VERSION 9.14.2

ENV NODE_CHECKSUM_ARM64 27453f7a0dd6b9e6738f1f6ea6a09b102ec7aa484de1e39d6a1c3608ad47aa6a
ENV PNPM_CHECKSUM_ARM64 74aeb6b07ce2ff52e458d6577f16db1ad53325002bdd9127aaed389b1eeb01eb
ENV NODE_CHECKSUM_X64 4f862bab52039835efbe613b532238b6e4dde98d139a34e6923193e073438b13
ENV PNPM_CHECKSUM_X64 dc7fa94424f75d89ef726f66467ea92f0aacb0cfb7e4c7fc2d7684cba5c18335

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
    build-essential python3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64;
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64;
    export ARCH="x64";
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64;
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64;
    export ARCH="arm64";
  else
    echo "Unsupported architecture: $TARGETARCH";
    exit 1;
  fi

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /node.tar.gz;
  echo "$NODE_CHECKSUM /node.tar.gz" | sha256sum -c;

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm;
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c;
EOF

RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1 \
  --exclude='*.md' --exclude='LICENSE' \
  --exclude='share' --exclude='lib/node_modules/' \
  --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'

RUN chmod a+rx /usr/local/bin/pnpm

RUN userdel -r ubuntu && useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store \
  && pnpm config set ignore-scripts false
RUN echo 'PS1="%d$ "' > ~/.zshrc
