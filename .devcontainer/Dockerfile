# Creates development machine inside docker
# so every developer will have the same environment

FROM registry.fedoraproject.org/fedora:41

ARG TARGETARCH

ENV NODE_VERSION 22.14.0
ENV PNPM_VERSION 10.7.0

ENV NODE_CHECKSUM_ARM64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_ARM64 68916f9fadde7cfea9eced8d88f3a2159d181b1fe5a1e405a71434fc05643405
ENV NODE_CHECKSUM_X64 69b09dba5c8dcb05c4e4273a4340db1005abeafe3927efda2bc5b249e80437ec
ENV PNPM_CHECKSUM_X64 d1e8009b1ac8c54050efd969d4b6a96eae4fdc3e1ed138741eaf5699a85a16cf

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
