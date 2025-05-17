# Creates development machine inside docker
# so every developer will have the same environment

FROM registry.fedoraproject.org/fedora:42@sha256:166380fbaa252673453d6d391841e35261da34fadb0ac2438dbba3be65a0c6c4

ARG TARGETARCH

ENV NODE_VERSION 22.15.1
ENV NODE_CHECKSUM_X64 7dca2ab34ec817aa4781e2e99dfd34d349eff9be86e5d5fbaa7e96cae8ee3179
ENV NODE_CHECKSUM_ARM64 7dca2ab34ec817aa4781e2e99dfd34d349eff9be86e5d5fbaa7e96cae8ee3179

ENV PNPM_VERSION 10.11.0
ENV PNPM_CHECKSUM_X64 fb28f89021562a8b251d8b34485a0b560683f096af17a0793139df6b4f3c4d5a
ENV PNPM_CHECKSUM_ARM64 fd030b0566a70862ae06102316ed16bde0a7f953130551923c8bc11bb2a8ed87

ENV PINACT_VERSION 3.0.1
ENV PINACT_CHECKSUM_X64 f4f35e2dc4cf1243cd0e8d3bc0b49c8b30c388d1dcae5907afcd97b00ddb556e
ENV PINACT_CHECKSUM_ARM64 b319fc572c3fae75a2744732d9c943d1b7402e1a43a3aabd8ab72f2feb1454f7

RUN dnf install -yq zsh micro git tig iputils psmisc procps-ng awk \
  && dnf clean all \
  && rm -rf /var/cache/dnf

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export PINACT_CHECKSUM=$PINACT_CHECKSUM_X64
    export ARCH="x64"
    export PINACT_ARCH="amd64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export PINACT_CHECKSUM=$PINACT_CHECKSUM_ARM64
    export ARCH="arm64"
    export PINACT_ARCH="arm64"
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
  rm /node.tar.xz

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c
  chmod a+rx /usr/local/bin/pnpm

  curl "https://github.com/suzuki-shunsuke/pinact/releases/download/v${PINACT_VERSION}/pinact_linux_${PINACT_ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pinact.tar.gz
  echo "$PINACT_CHECKSUM /pinact.tar.gz" | sha256sum -c
  tar -xf /pinact.tar.gz -C /usr/local/bin --remove-files \
    --exclude='LICENSE' --exclude='*.md'
  rm /pinact.tar.gz
EOF

RUN useradd -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
