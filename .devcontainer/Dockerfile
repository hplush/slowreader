# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.6.0
ENV PNPM_VERSION 9.7.0

ENV NODE_CHECKSUM_arm64 c6c7ee62de3637401c15df9a022afaa248d236d59ceca8c188944cf97d0be372
ENV PNPM_CHECKSUM_arm64 4d65bb31c25fae8813ed5a64abc42f75fb900e678cdb31c4001dacd1a4853c6a
ENV NODE_CHECKSUM_x64 f2f4ccbcbc0a443e5fadebd1149a22f96087ec09cef52ff343a15ee835206d96
ENV PNPM_CHECKSUM_x64 f81316609f23df6cef9b3ed7492a3e0c484fec3a66dfd324884e0ad67ed07581

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN <<EOF

  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=${NODE_CHECKSUM_x64};
    export PNPM_CHECKSUM=${PNPM_CHECKSUM_x64};
    export ARCH="x64";

  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_arm64;
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_arm64;
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
