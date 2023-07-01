# Contributing

You will need [`asdf`] tool with `nodejs` and `pnpm` plugins to keep versions
in sync with the project.

```sh
asdf plugin-add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf plugin-add pnpm https://github.com/jonathanmorley/asdf-pnpm.git
asdf install
```

But for one-time work, you can manually install versions according
to [`.tool-versions`](.tool-versions) file.

[`asdf`]: https://asdf-vm.com/guide/getting-started.html
