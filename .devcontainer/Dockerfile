# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:044e87b18b39eb9f081ddc306a01dafe050ab1b2ff6280c327e40fcee878eb6f

ARG TARGETARCH

ENV NODE_VERSION=24.14.0 \
  NODE_CHECKSUM_X64=41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df \
  NODE_CHECKSUM_ARM64=e7adfca03d9173276114a6f2219df1a7d25e1bfd6bbd771d3f839118a2053094

ENV PNPM_VERSION=10.30.3 \
  PNPM_CHECKSUM_X64=5dc971e801610471b5cd6729ba289531be6695bd50d5e833fe22b18896b13a06 \
  PNPM_CHECKSUM_ARM64=9488f48d6967bfa8f5ebc5c077aae297d2fe25287697b4c8edf991ff945d8af7

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk \
  && dnf clean all \
  && rm -rf /var/cache/dnf

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
