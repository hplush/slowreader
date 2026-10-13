# Slow Reader Verifier

Scripts to check that every release image is reproducible and `slowreader.app` sends files from a verified release.

Separated [GitLab CI](https://gitlab.com/hplush/slowreader-verifier/-/pipelines) runs them every hour and after every release and commits results to `releases/` and `checks/`.

- [`check-releases.sh`](./check-releases.sh): checks maintainer’s hardware key signature and CI provenance of new GitHub Releases, rebuilds the image by `docker buildx replay`, and saves the result to `releases/`.
- [`check-site.sh`](./check-site.sh): checks `/health`, compares `slowreader.app/manifest.json` and all its files with a verified release, and saves the result to `checks/DAY.txt`.
- [`allowed_signers`](./allowed_signers): maintainers’ hardware SSH keys, which sign release images.
- [`.gitlab-ci.yml`](./.gitlab-ci.yml): hourly CI job.

Both scripts sign results to the public append-only [Rekor](https://docs.sigstore.dev/logging/overview/) log: releases right after the check, `checks/` after the end of the day.

Scripts write results to the current folder. To run them locally, you need Docker with Buildx, [`gh`](https://cli.github.com), [`cosign`](https://docs.sigstore.dev/cosign/system_config/installation/), `jq`, `curl`, `openssl`, and OpenSSH 8.2+.

## Publish

GitLab repository has a copy of this folder. Run [`verifier/scripts/publish.sh`](https://github.com/hplush/slowreader/blob/main/verifier/scripts/publish.sh) from Slow Reader repository outside of Dev Container to replace scripts there by committed `verifier/` from `HEAD`. It keeps `releases/` and `checks/`, starts the check by new scripts, and waits for the result.

## Setup

1. In GitLab **Settings** → **Repository** → **Protected branches** allow to push to `main` for Developers and Maintainers and disable force push.
2. Create signing key by `cosign generate-key-pair` outside of Dev Container, commit `cosign.pub` to `verifier/`, and save `cosign.key` with its password in a password manager.
3. Create GitLab project access token in **Settings** → **Access tokens** with Developer role and `write_repository` scope.
4. Create GitHub fine-grained token with **Public repositories** read-only access. `gh` refuses to work without login even for public data.
5. Add protected variables in **Settings** → **CI/CD** → **Variables**:
   - `COSIGN_KEY`: File type with `cosign.key` content.
   - `COSIGN_PASSWORD`: masked and hidden.
   - `GH_TOKEN`: masked GitHub token.
   - `PUSH_TOKEN`: masked project access token.
6. Run `./verifier/scripts/publish.sh`.
7. Create hourly schedule in **Build** → **Pipeline schedules** with `0 * * * *` for `main` branch.
8. Create pipeline trigger token in **Settings** → **CI/CD** → **Pipeline trigger tokens** and add it as `VERIFIER_TRIGGER` secret to GitHub repository. Release workflow uses it to start the check right after the release.
