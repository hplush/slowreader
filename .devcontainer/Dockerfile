# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:3988086adef2975a8a3a6c15634e21625efebc6ac043c83f02f619efff6c5d11

ARG TARGETARCH

ENV NODE_VERSION=26.12.1 \
  NODE_CHECKSUM_X64=6170b2d474e1c626f43cff3adc118df9fe3b573258a4fc3d850c8dbc6b079bbd \
  NODE_CHECKSUM_ARM64=42aa04922591ee5d4dbc7740d452621acf28508239daa512f5ee8c47ee224fdb

ENV PNPM_VERSION=12.15.0 \
  PNPM_CHECKSUM_X64=55b5ed0092bd11176c1669598e231ae52e7cedac59de6efd0d415730f37d0598 \
  PNPM_CHECKSUM_ARM64=d7ce93a2c7d847d3a34bd3f559b60c14f578b1320c17cc352a2c5c5fdf956117

  ENV TOFU_VERSION=1.13.2 \
    TOFU_CHECKSUM_X64=ac05d9952662c7db28dd57e93f0a68018837bfdf9342384ec0987977c16a9645 \
    TOFU_CHECKSUM_ARM64=88e2d9e3f94f97b76ab2faf55ade87578f56aed19c5e45fa139d70e994366d1f

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
