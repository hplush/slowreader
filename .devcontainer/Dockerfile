# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:55159f5c92b7baf5f1c1ca1d727c95e77a4cb77c0829b2c11740a700ff4ea02b

ARG TARGETARCH

ENV NODE_VERSION=26.9.0 \
  NODE_CHECKSUM_X64=c6ecd8efc1c1d395265891675319da7a7b3785c6be174bd78933cf4f057624d1 \
  NODE_CHECKSUM_ARM64=686d07ed3bc5d68d9f7bd4939b7e8849a87d0664ac19c8c5474474f44cc956db

ENV PNPM_VERSION=12.6.0 \
  PNPM_CHECKSUM_X64=3f4c66f668d0e84219679982d095b30da68325e1fac9284e7f5dc1584bd3d13e \
  PNPM_CHECKSUM_ARM64=973af2b3eb9509416cf889a7336705062c936407d5fda07298814e7532f5dea1

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
