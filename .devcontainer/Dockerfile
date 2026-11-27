# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:45
FROM registry.fedoraproject.org/fedora@sha256:1bd80cd53c142fe07d25dac925494e02fa7aec33534ea30440e74f85014359a1

ARG TARGETARCH

ENV NODE_VERSION=26.13.1 \
  NODE_CHECKSUM_X64=5c063e46bab0fbc1c17cc445d7ff129cbdcd0471be6ed83b6ab864f8143bc864 \
  NODE_CHECKSUM_ARM64=89e1853138db51e8b82d3e98ba9c0d3f2956a28e5e55ea1b7e12d25aae92d5dd

ENV PNPM_VERSION=12.24.0 \
  PNPM_CHECKSUM_X64=1c67021e5203fb4c9cf11d9a4ade225417b299e6ef0316203e15b85cbe374585 \
  PNPM_CHECKSUM_ARM64=25d9b8ba9f192fa645240f4070380db80ce69b329aebd2b10155683dbb3e10ff


RUN dnf install -yq zsh micro git tig psmisc procps-ng gawk libatomic wget zip \
  gtk3 nss nspr alsa-lib cups-libs mesa-libgbm dbus-libs libX11-xcb \
  libXcomposite libXdamage libXrandr libXcursor libXi libxkbcommon \
  google-noto-sans-fonts google-noto-emoji-fonts gh jq bind-utils openssl \
  ansible-core openssh-clients iproute iputils which file lsof strace \
  nmap-ncat ripgrep \
  && dnf clean all \
  && rm -rf /var/cache/dnf

RUN <<EOF
  # Exit immediately if a command fails
  set -euo pipefail

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

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pnpm.tar.gz
  echo "$PNPM_CHECKSUM /pnpm.tar.gz" | sha256sum -c
  mkdir /usr/local/share/pnpm
  tar -xz -f /pnpm.tar.gz -C /usr/local/share/pnpm
  ln -s /usr/local/share/pnpm/pnpm /usr/local/bin/pnpm
  rm /pnpm.tar.gz
EOF

RUN useradd -s /bin/zsh developer

RUN mkdir /workspaces && chown developer:developer /workspaces

USER developer
RUN echo 'PS1="%d$ "' > ~/.zshrc
RUN mkdir /home/developer/.config && mkdir -p /home/developer/.local/share
