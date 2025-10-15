# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:42
FROM registry.fedoraproject.org/fedora@sha256:56e8d92c212af4d5af2247cb4925cbd3925388377d0559d7a9cc1599607a2b2e

ARG TARGETARCH

ENV NODE_VERSION=24.10.0 \
  NODE_CHECKSUM_X64=2642f4428869aca32443660fd71b3918e2be1277a899bdcaeb64c93b54b5af17 \
  NODE_CHECKSUM_ARM64=07f0558316ebb8977dd6fb29b4de8d369a639d3d8cef544293852a6f5eea6af8

ENV PNPM_VERSION=10.18.3 \
  PNPM_CHECKSUM_X64=042fdc373cccacbc9a305c7578bd13862512760bc7ed47c0edc1e3bd7bdc35e1 \
  PNPM_CHECKSUM_ARM64=4af25f6d19c7e1aad4f0d1ca14844b65c9fb45d93d4ef37fb61cac903b477de0

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
    --exclude='share' --exclude='lib/node_modules/' \
    --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'
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
