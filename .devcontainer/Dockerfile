# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:b1fe5b4aeef7add2e0a0fd9cd567054ab31989775798c01b99c262495af5b863

ARG TARGETARCH

ENV NODE_VERSION=26.1.0 \
  NODE_CHECKSUM_X64=9fc6f21b6c4a62439727123e510e9c39febb2f563738f4927cd3e0b288c9b3c9 \
  NODE_CHECKSUM_ARM64=058f00fe6c84f804b4b96aab377f76ed57dd0be5f10af4dcc0fded172746f366

ENV PNPM_VERSION=11.1.2 \
  PNPM_CHECKSUM_X64=f82f761572d9621c5a646ccc00a1ecec4cf5839d66b714497e6ca10cd2e086ee \
  PNPM_CHECKSUM_ARM64=a62ca954f27cb0494d29f1a632d1d7a8a06d2c3608a4645f5c0714a3204da02b

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk libatomic \
  && dnf clean all \
  && rm -rf /var/cache/dnf

RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export ARCH="x64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
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
    --exclude='share' --exclude='lib/node_modules/' --exclude='bin/corepack'
  rm /node.tar.xz

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pnpm.tar.gz
  echo "$PNPM_CHECKSUM /pnpm.tar.gz" | sha256sum -c
  mkdir /usr/local/share/pnpm
  tar -xz -f /pnpm.tar.gz -C /usr/local/share/pnpm
  ln -s /usr/local/share/pnpm/pnpm /usr/local/bin/pnpm
  rm /pnpm.tar.gz
EOF

RUN useradd -s /bin/zsh developer

USER developer
RUN echo 'PS1="%d$ "' > ~/.zshrc
RUN mkdir /home/developer/.config && mkdir -p /home/developer/.local/share
