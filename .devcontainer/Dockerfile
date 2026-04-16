# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:38b2bac8a7f6bf39649bd4cd5403cb1cf6cd1e60414caf8c8042e9d5179014ac

ARG TARGETARCH

ENV NODE_VERSION=24.15.0 \
  NODE_CHECKSUM_X64=472655581fb851559730c48763e0c9d3bc25975c59d518003fc0849d3e4ba0f6 \
  NODE_CHECKSUM_ARM64=f3d5a797b5d210ce8e2cb265544c8e482eaedcb8aa409a8b46da7e8595d0dda0

ENV PNPM_VERSION=10.33.0 \
  PNPM_CHECKSUM_X64=8d4e8f7d778e8ac482022e2577011706a872542f6f6f233e795a4d9f978ea8b5 \
  PNPM_CHECKSUM_ARM64=06755ad2817548b84317d857d5c8003dc6e9e28416a3ea7467256c49ab400d48

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
