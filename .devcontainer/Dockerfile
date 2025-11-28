# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:999871d71f32e55ccb858062ec46ccaca1d0c1078746552ba5a0409aff2dd2b6

ARG TARGETARCH

ENV NODE_VERSION=24.11.1 \
  NODE_CHECKSUM_X64=60e3b0a8500819514aca603487c254298cd776de0698d3cd08f11dba5b8289a8 \
  NODE_CHECKSUM_ARM64=6b0863fb9f627bf4a6c5948dce1de4398174a2e05dbe717503d828e211ca01f0

ENV PNPM_VERSION=10.24.0 \
  PNPM_CHECKSUM_X64=985824ae016db3c7bbd7b39dcb4e6f5740b11cce79f5c43d5e5e640768fd4806 \
  PNPM_CHECKSUM_ARM64=1447737a6e8003386507fdcdafa376289b4abfff5867c8ba6a189b2fded13a4b

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk openssh-server \
  && dnf clean all \
  && rm -rf /var/cache/dnf \
  && mkdir -p /var/run/sshd \
  && ssh-keygen -A

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

RUN mkdir -p /home/developer/.local/share/pnpm/store \
  && pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
