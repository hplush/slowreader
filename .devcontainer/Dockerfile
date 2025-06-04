# Creates development machine inside docker
# so every developer will have the same environment

FROM registry.fedoraproject.org/fedora:42@sha256:5d82c0f1232ce0ae3f12c12f7a099ae4dbadf5fc471b7a35cfd85dad690bf8e0

ARG TARGETARCH

ENV NODE_VERSION 22.16.0
ENV NODE_CHECKSUM_X64 f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e
ENV NODE_CHECKSUM_ARM64 f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e

ENV PNPM_VERSION 10.11.1
ENV PNPM_CHECKSUM_X64 0c6773d145024f7641b6d0b421ae12c36884c8dc2164d3ed8b78c82872c0a23d
ENV PNPM_CHECKSUM_ARM64 e6c887280a4c4c25a4adc8982acef16725838973dd33ad936a4e08a0ffc18a32

ENV PINACT_VERSION 3.0.1
ENV PINACT_CHECKSUM_X64 f4f35e2dc4cf1243cd0e8d3bc0b49c8b30c388d1dcae5907afcd97b00ddb556e
ENV PINACT_CHECKSUM_ARM64 b319fc572c3fae75a2744732d9c943d1b7402e1a43a3aabd8ab72f2feb1454f7

RUN dnf install -yq zsh micro git tig iputils psmisc procps-ng awk \
  openssh-server \
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
