# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:8ade22c0f76f6b2f0892290b1fb39fa1bda1566ba6e276a2ed427f45589c159b

ARG TARGETARCH

ENV NODE_VERSION=26.11.1 \
  NODE_CHECKSUM_X64=3883bfc73f9a680ca4eab04b196068aaaab1373ffa77d8fc1a4408222495b651 \
  NODE_CHECKSUM_ARM64=0945e2cde6aa0f54d980f03874dfe5cf3a549ce714c7fb9019e591ce0accf282

ENV PNPM_VERSION=12.12.0 \
  PNPM_CHECKSUM_X64=20d68d53bfa89ba9cf727c1ffd0d3c1c3193e933d097b36e7f29f743257713d9 \
  PNPM_CHECKSUM_ARM64=cf3e59a576d3561b721ab214a8abde7a37982777001c4ba75019edeed1098ae6

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
