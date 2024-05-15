# Creates development machine inside docker
# so every developer will have the same environment

FROM node:22.1.0-alpine

RUN apk update \
  && apk add --no-cache zsh git eza tig ripgrep bat curl micro starship \
  && rm -rf /var/cache/apk/*
RUN npm install -g pnpm@9.1.1
RUN sed -i 's|/node:/bin/sh|/node:/bin/zsh|' /etc/passwd

USER node

RUN micro -plugin install editorconfig
RUN mkdir -p /home/node/.config \
  && echo 'eval "$(starship init zsh)"' >> /home/node/.zshrc
RUN printf 'format = "$directory$git_branch$line_break$character"' \
  > /home/node/.config/starship.toml
