# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:ba97c95fbd23b7a4407e056e56efc69cb3a3b841971b0278f352e7825b191452

ARG TARGETARCH

ENV NODE_VERSION=24.12.0 \
  NODE_CHECKSUM_X64=bdebee276e58d0ef5448f3d5ac12c67daa963dd5e0a9bb621a53d1cefbc852fd \
  NODE_CHECKSUM_ARM64=a06d42807fb500f7459e5f3fa6cb431447352826ee6f07e14adfeec58a1b3210

ENV PNPM_VERSION=10.26.1 \
  PNPM_CHECKSUM_X64=1e79584ec70e1b9a34e744ac53943f7dd9d83256af0a1136d4c93fdcf5fb3bb3 \
  PNPM_CHECKSUM_ARM64=d87da2120c356a210fea325e7333b5f8a22c3bac652203cd4d2492fcc8cb49f3

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
