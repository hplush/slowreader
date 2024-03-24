# Core Team Onboarding

- [Enable 2FA on GitHub](#enable-2fa-on-github)
- [Encrypt Your Laptop](#encrypt-your-laptop)
- [Enable signing git commits](#enable-signing-git-commits)

## Enable 2FA on GitHub

All core team members _must_ [enable two-factor authentication](https://github.com/settings/security) on GitHub (and any related platform).

You can start by using any TOTP application (that app with 6-digit codes). We just don’t recommend keeping TOTP codes in the same cloud where you have your GitHub password.

The best way to have 2FA is with a hardware key. Remember to store Recovery codes in a secure place in case you lose the key.

## Encrypt Your Laptop

Your SSH key to access the repository is stored on your laptop.

All core team members _must_ enable file system encryption for the machine.

Check the documentation for your operating system.

## Enable signing git commits

By default, anybody can make commits with your name.

We recommend enabling signing git commits to verify that these are commits really made by you.

```sh
git config --global commit.gpgsign true
```

If you don’t have a GPG key, you can use an SSH key (the same key you sign to GitHub):

```sh
git config --global gpg.format ssh
# Replace the path to your key
git config --global user.signingKey ~/.ssh/id_rsa.pub
```

Then add your SSH key _also_ as the commit signing key:

1. Open [New SSH Key](https://github.com/settings/ssh/new) page.
2. Select `Key type`: `Signing key`.
3. Copy the content of `~/.ssh/id_rsa.pub` file (or other file you used in `user.signingKey` above).

If you're on WSL2, this may help:

- Add those lines to `~/.gnupg/gpg.conf`

```sh
use-agent
pinentry-mode loopback
```

- Add this line to `~/.gnupg/gpg-agent.conf`

```sh
allow-loopback-pinentry
```
