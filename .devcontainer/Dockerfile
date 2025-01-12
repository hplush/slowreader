# Creates development machine inside docker
# so every developer will have the same environment

FROM docker.io/ubuntu:24.04

ARG TARGETARCH

ENV NODE_VERSION 22.13.0
ENV PNPM_VERSION 10.0.0

ENV NODE_CHECKSUM_ARM64 e0cc088cb4fb2e945d3d5c416c601e1101a15f73e0f024c9529b964d9f6dce5b
ENV PNPM_CHECKSUM_ARM64 9bb1b569890eee8a7f535fadda6f9a78ffeb818a780b8c591e92478089eafafd
ENV NODE_CHECKSUM_X64 9a33e89093a0d946c54781dcb3ccab4ccf7538a7135286528ca41ca055e9b38f
ENV PNPM_CHECKSUM_X64 e1025c55ae220c66a980272ecb343c4860b129687e4e1c41bc5f343ee127d455

RUN apt-get update \
  && apt-get install -y eza zsh git tig ripgrep bat curl tar micro psmisc \
    build-essential python3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN <<EOF
  if [ "$TARGETARCH" = "amd64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_X64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_X64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.62.0/difft-x86_64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=bf546299085abd497dce115739bc00370d0c0386030e43f14fe137ef3a5f773b
    export ARCH="x64"
  elif [ "$TARGETARCH" = "arm64" ]; then
    export NODE_CHECKSUM=$NODE_CHECKSUM_ARM64
    export PNPM_CHECKSUM=$PNPM_CHECKSUM_ARM64
    export DIFFT_URL=https://github.com/Wilfred/difftastic/releases/download/0.62.0/difft-aarch64-unknown-linux-gnu.tar.gz
    export DIFFT_CHECKSUM=3b5e935561dfc9656309c29f0a2aa57cf96592f76c03da52db166d3a73e161e2
    export ARCH="arm64"
  else
    echo "Unsupported architecture: $TARGETARCH"
    exit 1
  fi

  curl "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.gz" \
    --fail --show-error --location --silent --output /node.tar.gz
  echo "$NODE_CHECKSUM /node.tar.gz" | sha256sum -c

  curl "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${ARCH}" \
    --fail --show-error --location --silent --output /usr/local/bin/pnpm
  echo "$PNPM_CHECKSUM /usr/local/bin/pnpm" | sha256sum -c

  curl "${DIFFT_URL}" \
    --fail --show-error --location --silent --output /difft.tar.gz
  echo "$DIFFT_CHECKSUM /difft.tar.gz" | sha256sum -c

  tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1 \
    --exclude='*.md' --exclude='LICENSE' \
    --exclude='share' --exclude='lib/node_modules/' \
    --exclude='bin/npm' --exclude='bin/npx' --exclude='bin/corepack'
  tar -xz -f /difft.tar.gz -C /usr/local/bin --remove-files

  chmod a+rx /usr/local/bin/pnpm
EOF

RUN userdel -r ubuntu && useradd -m -s /bin/zsh developer
USER developer

RUN pnpm config set store-dir /home/developer/.local/share/pnpm/store
RUN echo 'PS1="%d$ "' > ~/.zshrc
