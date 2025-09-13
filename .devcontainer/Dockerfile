# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:42
FROM registry.fedoraproject.org/fedora@sha256:15ddf32378b6638036602e8226916282acd8788cff104995fff429ad8ac80e92

ARG TARGETARCH

ENV NODE_VERSION=24.8.0 \
  NODE_CHECKSUM_X64=2598641d188b41793930917f1a99a81c9615856b4205d408a44ab676c1acbb3d \
  NODE_CHECKSUM_ARM64=323e6bc34bfe82a21f42d9eb94d9a2b6c8082d8c03cb510cf2f95dd1dcaa1531

ENV PNPM_VERSION=10.16.0 \
  PNPM_CHECKSUM_X64=df412995b282efedc83b6441a91bbd7cb4ca689f7b310c1f7431c9e7e1f56f56 \
  PNPM_CHECKSUM_ARM64=bd933487981ab76932d2f0efde7cd238b8ab139987103881a6521e856502c262

ENV PINACT_VERSION=3.0.1 \
  PINACT_CHECKSUM_X64=f4f35e2dc4cf1243cd0e8d3bc0b49c8b30c388d1dcae5907afcd97b00ddb556e \
  PINACT_CHECKSUM_ARM64=b319fc572c3fae75a2744732d9c943d1b7402e1a43a3aabd8ab72f2feb1454f7

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk openssh-server \
  && dnf clean all \
  && rm -rf /var/cache/dnf \
  && mkdir -p /var/run/sshd \
  && ssh-keygen -A

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export PINACT_CHECKSUM=$PINACT_CHECKSUM_X64
    export ARCH="x64"
    export PINACT_ARCH="amd64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export PINACT_CHECKSUM=$PINACT_CHECKSUM_ARM64
    export ARCH="arm64"
    export PINACT_ARCH="arm64"
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

  curl "https://github.com/suzuki-shunsuke/pinact/releases/download/v${PINACT_VERSION}/pinact_linux_${PINACT_ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /pinact.tar.gz
  echo "$PINACT_CHECKSUM /pinact.tar.gz" | sha256sum -c
  tar -xf /pinact.tar.gz -C /usr/local/bin --remove-files \
    --exclude='LICENSE' --exclude='*.md'
  rm /pinact.tar.gz
EOF

RUN useradd -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
