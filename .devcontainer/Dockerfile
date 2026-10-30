# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:44
FROM registry.fedoraproject.org/fedora@sha256:b414c09be79dd1f32529b55b096b6bb30435d82ee16fbdbbabf8985eb5f86db0

ARG TARGETARCH

ENV NODE_VERSION=26.13.0 \
  NODE_CHECKSUM_X64=d28a96af6c38596f6d9d97c0ee531c13d238d757742387d1928de822d959e997 \
  NODE_CHECKSUM_ARM64=406fe3fbde1c054adff8b297c16fdb5af6659db327c1ac8acd46b56ef1af9a92

ENV PNPM_VERSION=12.17.0 \
  PNPM_CHECKSUM_X64=2c58959fd5df5cb9f4e72784c08a60ffc7ee558fed9b04b22254e29112203a51 \
  PNPM_CHECKSUM_ARM64=ce5a5b95a9974a0bbd713a5ef74416dbcd0e3fdf11f69ea92c5995b9c18ccb47

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
