# Creates development machine inside docker
# so every developer will have the same environment

# registry.fedoraproject.org/fedora:43
FROM registry.fedoraproject.org/fedora@sha256:344c39d33f475dd770dc310c5a24958420a70e51cc928b121ef699baec1f2020

ARG TARGETARCH

ENV NODE_VERSION=24.13.1 \
  NODE_CHECKSUM_X64=30215f90ea3cd04dfbc06e762c021393fa173a1d392974298bbc871a8e461089 \
  NODE_CHECKSUM_ARM64=c827d3d301e2eed1a51f36d0116b71b9e3d9e3b728f081615270ea40faac34c1

ENV PNPM_VERSION=10.30.1 \
  PNPM_CHECKSUM_X64=44584d1bf4964eab9117484bbac165279f5584d743b98dfddb72f2cde5caff92 \
  PNPM_CHECKSUM_ARM64=f6bd5a8b99543511421a0e77935c93b744feaa2e65fdd91969f966460f6b6f5a

RUN dnf install -yq zsh micro git tig psmisc procps-ng awk \
  && dnf clean all \
  && rm -rf /var/cache/dnf

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
    --exclude='share' --exclude='lib/node_modules/' --exclude='bin/corepack'
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
