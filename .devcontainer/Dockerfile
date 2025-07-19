# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:42
FROM registry.fedoraproject.org/fedora@sha256:e4a8e76255e314b928d335b99cb133a1e6c64cb7a7fb5bc2a5d28c3ac3f067cb

ARG TARGETARCH

ENV NODE_VERSION=24.4.1 \
  NODE_CHECKSUM_X64=7e067b13cd0dc7ee8b239f4ebe1ae54f3bba3a6e904553fcb5f581530eb8306d \
  NODE_CHECKSUM_ARM64=7e067b13cd0dc7ee8b239f4ebe1ae54f3bba3a6e904553fcb5f581530eb8306d

ENV PNPM_VERSION=10.13.1 \
  PNPM_CHECKSUM_X64=e1cab530ea8252eb90e4add71d95838fd6f2656e6977f120df5ecb6f5b2822e0 \
  PNPM_CHECKSUM_ARM64=0f6d0a1e1b95f2231ce76c13330c754bb76b8f069ca165e5cb8dbe225259f841

ENV PINACT_VERSION=3.0.1 \
  PINACT_CHECKSUM_X64=f4f35e2dc4cf1243cd0e8d3bc0b49c8b30c388d1dcae5907afcd97b00ddb556e \
  PINACT_CHECKSUM_ARM64=b319fc572c3fae75a2744732d9c943d1b7402e1a43a3aabd8ab72f2feb1454f7

RUN dnf install -yq zsh micro git tig iputils psmisc procps-ng awk \
  openssh-server \
  && dnf clean all \
  && rm -rf /var/cache/dnf \
  && mkdir -p /var/run/sshd \
  && ssh-keygen -A

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
