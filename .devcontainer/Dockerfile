# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:56afdee8e93ec4573788268997af39f6e821452b67c49c518e4e3175cb6e1fe7

ARG TARGETARCH

ENV NODE_VERSION=24.13.0 \
  NODE_CHECKSUM_X64=e798599612f4bb71333a3397ab0d095fd62214e115aea45aa858a145fc72d67e \
  NODE_CHECKSUM_ARM64=aa881151bd0f9f154a0424dd60a72e9ce10672619121658c278a24327ef46831

ENV PNPM_VERSION=10.28.0 \
  PNPM_CHECKSUM_X64=348e863d17a62411a65f900e8d91395acabae9e9237653ccc3c36cb385965f28 \
  PNPM_CHECKSUM_ARM64=5bf35f1927d5ea0aa76408504f834e3089679d9e18342ab19502a28fb0116391

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk openssh-server \
  && dnf clean all \
  && rm -rf /var/cache/dnf \
  && mkdir -p /var/run/sshd \
  && ssh-keygen -A

RUN <<EOF
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

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c
  chmod a+rx /usr/local/bin/pnpm
EOF

RUN useradd -s /bin/zsh developer
USER developer

RUN mkdir -p /home/developer/.local/share/pnpm/store \
  && pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
