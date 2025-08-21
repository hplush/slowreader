# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:42
FROM registry.fedoraproject.org/fedora@sha256:cf1bfad0f1367db1a4d1cd1022cea46f17cf93b8c180c25c4ea65947b7459ef4

ARG TARGETARCH

ENV NODE_VERSION=24.6.0 \
  NODE_CHECKSUM_X64=fda6f6a00759eea0a27e34fcdfdd09c2b0413855edaa7f746246cf81c0186e26 \
  NODE_CHECKSUM_ARM64=fda6f6a00759eea0a27e34fcdfdd09c2b0413855edaa7f746246cf81c0186e26

ENV PNPM_VERSION=10.15.0 \
  PNPM_CHECKSUM_X64=c9548da52cba52401a8419e1dbc135e2206f74508c18e50ef1ce68e70e7cbf02 \
  PNPM_CHECKSUM_ARM64=4ab218bdf86285f21ceb8e4263e6e737af7e52fe6c76cf8035eea540a153f31c

ENV PINACT_VERSION=3.0.1 \
  PINACT_CHECKSUM_X64=f4f35e2dc4cf1243cd0e8d3bc0b49c8b30c388d1dcae5907afcd97b00ddb556e \
  PINACT_CHECKSUM_ARM64=b319fc572c3fae75a2744732d9c943d1b7402e1a43a3aabd8ab72f2feb1454f7

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk openssh-server \
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
