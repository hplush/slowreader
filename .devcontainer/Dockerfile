# Creates development machine inside docker
# so every developer will have the same environment

FROM registry.fedoraproject.org/fedora:41

ARG TARGETARCH

ENV NODE_VERSION 22.14.0
ENV PNPM_VERSION 10.7.1

ENV NODE_CHECKSUM_ARM64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_ARM64 679ae00c18e30e68ed921f39f23b27905f2239caa51b01811262d7f2d2d71c7d
ENV NODE_CHECKSUM_X64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_X64 9ef305b7be447c9d6899b9b4618b7a788e5eb09f38398196d648909cbe12da72

RUN dnf update -yq \
  && dnf install -yq zsh eza bat micro git tig ripgrep iputils \
    psmisc procps-ng difftastic \
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

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
