# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.8.0
ENV PNPM_VERSION 9.10.0

ENV NODE_CHECKSUM_ARM64 a23afe3a54270accabcd9be0fc0dbec6645e8c5b8b06040dcdf0086a7047622d
ENV PNPM_CHECKSUM_ARM64 e51971cedec2feac0898e564fa55dbf96f69da020dcf14c02a74ebd3f9e32c14
ENV NODE_CHECKSUM_X64 a0bc969f61b96575a4b2cdd239729aa3e721384fa9ca3fb926a9582c019c1bbc
ENV PNPM_CHECKSUM_X64 1258469942b30bbb3ee7cea12a97cb58e889e3b32a23bbed3f0e9bb42cca5cd8

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
