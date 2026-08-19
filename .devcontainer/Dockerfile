# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:e0793999ac6725ff5fcf394862a8e42301493c81295dba1b22d7049e2708ab49

ARG TARGETARCH

ENV NODE_VERSION=26.7.0 \
  NODE_CHECKSUM_X64=982aa24dd8be4c889c6a8ab337ddff3b0896645b20f4239356e80552c16277ee \
  NODE_CHECKSUM_ARM64=afc7a004018485092ac8985b817b0d5684472bd9472e0b57d2ab88737e50090d

ENV PNPM_VERSION=12.0.0-rc.7 \
  PNPM_CHECKSUM_X64=7870f46e4f7f9e6aab983ffe26a87945cebfa80c5683458169665ed423cf92bb \
  PNPM_CHECKSUM_ARM64=6d31583bd708faef8eb6b1c3902a1a3e191dd25ce29e630fead9b38574bdf1e6

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk libatomic wget \
  gtk3 nss nspr alsa-lib cups-libs mesa-libgbm dbus-libs libX11-xcb \
  libXcomposite libXdamage libXrandr libXcursor libXi libxkbcommon \
  google-noto-sans-fonts google-noto-emoji-fonts \
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

USER developer
RUN echo 'PS1="%d$ "' > ~/.zshrc
RUN mkdir /home/developer/.config && mkdir -p /home/developer/.local/share
