# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:4a78eff1423dcce55cf68b8fd66e7cdca61c85978283db3ecc3089a8419fbbc0

ARG TARGETARCH

ENV NODE_VERSION=26.12.0 \
  NODE_CHECKSUM_X64=fd47865ecd6391ebb431fc815e01b9135bf83ded5cf373247e9331e196b7aded \
  NODE_CHECKSUM_ARM64=fd6cc729fa4448c2ac27c3fca5606019ced63c65a15c152c8df03e0cbce7f4c5

ENV PNPM_VERSION=12.14.0 \
  PNPM_CHECKSUM_X64=3910c3852136bed5bc1511b9137a45fd4357ed6b3970d9d08893641e9005867e \
  PNPM_CHECKSUM_ARM64=cfc780b9e690549e6633e1045fb1fb6ef84e390711e2099e6ccbae91c32456ea

  ENV TOFU_VERSION=1.13.1 \
    TOFU_CHECKSUM_X64=378ada19d4bc70c43732004e8159be771b23b9a5afdf059e5f8a2b3fa2c70a69 \
    TOFU_CHECKSUM_ARM64=9c1ef375aa1852db0b2888aa921b640c71f8140d4682aa4fec99378a64fa7dc3

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk libatomic wget zip \
  gtk3 nss nspr alsa-lib cups-libs mesa-libgbm dbus-libs libX11-xcb \
  libXcomposite libXdamage libXrandr libXcursor libXi libxkbcommon \
  google-noto-sans-fonts google-noto-emoji-fonts gh jq bind-utils openssl \
  && dnf clean all \
  && rm -rf /var/cache/dnf

RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export TOFU_CHECKSUM=$TOFU_CHECKSUM_X64
    export ARCH="x64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export TOFU_CHECKSUM=$TOFU_CHECKSUM_ARM64
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

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pnpm.tar.gz
  echo "$PNPM_CHECKSUM /pnpm.tar.gz" | sha256sum -c
  mkdir /usr/local/share/pnpm
  tar -xz -f /pnpm.tar.gz -C /usr/local/share/pnpm
  ln -s /usr/local/share/pnpm/pnpm /usr/local/bin/pnpm
  rm /pnpm.tar.gz

  curl "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${TARGETARCH}.tar.gz" \
    --fail --show-error --location --silent --output /tofu.tar.gz
  echo "$TOFU_CHECKSUM /tofu.tar.gz" | sha256sum -c
  tar -xz -f /tofu.tar.gz -C /usr/local/bin tofu
  rm /tofu.tar.gz
EOF

RUN useradd -s /bin/zsh developer

RUN mkdir /workspaces && chown developer:developer /workspaces

USER developer
RUN echo 'PS1="%d$ "' > ~/.zshrc
RUN mkdir /home/developer/.config && mkdir -p /home/developer/.local/share
