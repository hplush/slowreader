# Slow Reader Verifier

Scripts to check that every release image is reproducible and `slowreader.app` sends files from a verified release.

Separated [GitLab CI](https://gitlab.com/hplush/slowreader-verifier/-/pipelines) runs them every hour and after every release, commits results to `releases/` and `checks/`, and publishes them on [status page](https://hplush.gitlab.io/slowreader-verifier/).

- [`check-releases.sh`](./check-releases.sh): checks maintainer’s hardware key signature and CI provenance of new GitHub Releases, rebuilds the image by `docker buildx replay`, and saves the result to `releases/`.
- [`check-site.sh`](./check-site.sh): checks `/health`, compares `slowreader.app/manifest.json` and all its files with a verified release, and saves the result to `checks/DAY.txt`.
- [`allowed_signers`](./allowed_signers): maintainers’ hardware SSH keys, which sign release images.
- [`index.html`](./index.html): status page, which also checks `slowreader.app` from the visitor’s browser.
- [`build-index.sh`](./build-index.sh): prepares `public/` with the page, results, and `index.json` list of them, since static hosting can’t list folders.
- [`.gitlab-ci.yml`](./.gitlab-ci.yml): hourly CI job and status page publishing by GitLab Pages.

Both scripts sign results to the public append-only [Rekor](https://docs.sigstore.dev/logging/overview/) log: releases right after the check, `checks/` after the end of the day.

Scripts write results to the current folder. To run them locally, you need Docker with Buildx, [`gh`](https://cli.github.com), [`cosign`](https://docs.sigstore.dev/cosign/system_config/installation/), `jq`, `curl`, `openssl`, and OpenSSH 8.2+.

## Publish

GitLab repository has a copy of this folder. Run [`verifier/scripts/publish.sh`](https://github.com/hplush/slowreader/blob/main/verifier/scripts/publish.sh) from Slow Reader repository outside of Dev Container to replace scripts there by committed `verifier/` from `HEAD` without `scripts/` and adds root `LICENSE.md`. It keeps `releases/` and `checks/`, starts the check by new scripts, and waits for the result.

## Setup

1. Create push key by `ssh-keygen -t ed25519 -N '' -C verifier -f push_key` outside of Dev Container and add `push_key.pub` in GitLab **Settings** → **Repository** → **Deploy keys** with **Grant write permissions to this key**.
2. In **Settings** → **Repository** → **Branch rules** open `main` rule (or add it by **Add branch rule** → **Branch name or pattern**), set **Allowed to push and merge** to Maintainers and the deploy key, and disable **Allow force push**.
3. Create signing key by `cosign generate-key-pair` outside of Dev Container, commit `cosign.pub` to `verifier/`, and save `cosign.key` with its password in a password manager.
4. Create GitHub fine-grained token with **Public repositories** read-only access and expiration of 1 year or less, since `hplush` organization forbids longer tokens. `gh` refuses to work without login even for public data. Renew it every year.
5. Add protected variables in **Settings** → **CI/CD** → **Variables**:
   - `COSIGN_KEY`: File type with `cosign.key` content.
   - `COSIGN_PASSWORD`: masked and hidden.
   - `GH_TOKEN`: masked GitHub token.
   - `PUSH_KEY`: File type with `push_key` content. Delete `push_key` after it.
6. Run `./verifier/scripts/publish.sh`.
7. Create hourly schedule in **Build** → **Pipeline schedules** with `0 * * * *` for `main` branch.
8. In **Deploy** → **Pages** uncheck **Use unique domain** and click **Save changes** to get `hplush.gitlab.io/slowreader-verifier` address. In **Settings** → **General** → **Visibility, project features, permissions** set **Project visibility** to **Public**, set **Pages** to **Everyone**, and click **Save changes**. Otherwise the status page asks visitors to log in to GitLab.
9. Create pipeline trigger token in **Settings** → **CI/CD** → **Pipeline trigger tokens** and add it as `VERIFIER_TRIGGER` secret to GitHub repository. Release workflow uses it to start the check right after the release.
