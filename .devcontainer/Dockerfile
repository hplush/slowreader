# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.10.0
ENV PNPM_VERSION 9.12.2

ENV NODE_CHECKSUM_ARM64 17abee3dfe6ffcda95cab08bb5f43de7f88d04e9607c517e701c6e623358dc7c
ENV PNPM_CHECKSUM_ARM64 67825970c8ff35bb6ee247f7893ff3b7afe74e004d2c75c51b3daa0267c2cae3
ENV NODE_CHECKSUM_X64 674fef1891cc9927b5dc2b0ee2399b77f6621e6b3157f563a9e9491ad3db107b
ENV PNPM_CHECKSUM_X64 32f69bf331ad84c0eded4c3ec4403344a9adc5998a73f6714680fb5f352e3d3d

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
