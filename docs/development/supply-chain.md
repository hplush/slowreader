# How We Protect From Supply Chain Attacks?

A supply chain attack is malicious code, which comes to the project not from our developers, but from a dependency, a build tool, a CI action, or a base image. This guide lists every measure we use against it.

## Choosing Dependencies

1. **Few dependencies.** We avoid adding dependencies. Every dependency is one more team, which can be hacked. Before adding one, we compare alternatives by project activity, size, and number of sub-dependencies (see [README](../../README.md#dependencies)).
2. **`--prod` install.** We do not install development tools during the deploy. Linters, tests, and type checkers can be hacked too, but they never get to our servers, because we keep them in `devDependencies` and install only production ones (`--prod`).

## Installing Dependencies

1. **Release cooldown.** We do not install a new version during the first day after its release. Malicious versions are usually found and removed by npm in a few hours, so a day of waiting protects us from most of the attacks on popular packages. Only our own and a few well-known packages skip the waiting (`minimumReleaseAge` in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)).
2. **npm provenance.** We do not install a version, which was published in a less secure way than the previous ones. Many packages are published from CI, and npm shows a proof that this version was built from a specific commit of the package’s repository. If attackers steal the maintainer’s npm token, they can publish a version only from their own machine without such proof. So when a package, which always had the proof, suddenly releases a version without it, it is a sign of attack and pnpm refuses to install it (`trustPolicy: no-downgrade`).
3. **No install scripts.** We do not run `postinstall` and other scripts of dependencies during the install. These scripts run on developer machines and CI right during `pnpm install` even before anyone uses the package, so they are the favorite place for malicious code. Only `esbuild` can run a script to download its binary (`allowBuilds`).

## Updating Dependencies

1. **Dependency diff review.** We review the real code changes of updated dependencies, not only the changelog, because malicious code is never mentioned in the changelog (`pnpm update-review` with [Multiocular](https://github.com/ai/multiocular)).
2. **`pnpm audit`.** Every day CI checks our production dependencies and Node.js for known vulnerabilities (the [Vulnerability Audit](../../.github/workflows/audit.yml) workflow).
3. **[Socket](https://github.com/SocketDev/socket-python-cli)** checks every dependency change for suspicious packages: new install scripts, network access, or obfuscated code.

## Development Environment

1. **Dev Container.** Developers work inside [Dev Container](../../.devcontainer/). If some dependency is malicious, it gets access only to the container, but not to the developer’s SSH keys, browser, and other projects.
2. **Checksums.** Dev Container’s base image, Node.js, and pnpm are checked by hash, so attackers can’t replace them on the download server.

## Maintainer Accounts

1. **Hardware keys.** Maintainers use hardware keys as the second factor for their accounts and to access critical parts like our cloud servers. Attackers can steal a password or a one-time code by a fake login page, but a hardware key checks the real domain and never gives its secret away. Malware on the maintainer’s computer can’t copy the key to use it later from its own machine.

## GitHub Actions

1. **Actions pinned by hash.** We use actions by commit hash, not by version tag. The action’s author or attacker with the author’s account can move a tag to malicious code, but can’t change the code of a commit (`scripts/check-versions.ts` checks it).
2. **Egress allow-list.** CI can connect only to the hosts from the workflow’s allow-list. Even if malicious code runs in CI, it can’t send our secrets away or download the rest of the attack ([Harden Runner](https://docs.stepsecurity.io/harden-runner)).
3. **Minimal job permissions.** Every job gets only the permissions it needs. Tests run a lot of tools, so they can only read the repository. Only the image build and tag jobs can publish images, and only the deploy job can deploy.
4. **`persist-credentials: false`.** Later steps of the job can’t take GitHub token from the repository checkout (`persist-credentials: false`).
5. **Isolated build job.** Image build runs on a separated machine from tests. Nothing from the test machine, where many development tools run, gets into the image.
6. **OIDC deploy.** Staging deploy has no long-living secret, which can be stolen. GitHub gives the deploy job a token, which works a few minutes, and our cloud accepts it only from our deploy workflow.
7. **`workflow_run` previews.** Pull requests from anyone can’t get our secrets. [The first workflow](../../.github/workflows/preview-prepare.yml) builds the preview from the pull request’s code without secrets. [The second one](../../.github/workflows/preview-deploy.yml) has secrets, but is always taken from `main` and never runs the pull request’s code: it only pushes the built image and deploys it, if a maintainer added the `deploy-preview` label.
8. **[zizmor](https://github.com/zizmorcore/zizmor)** checks workflows for known mistakes, which allow attackers to run their code in our CI.

## Docker Image

1. **Distroless image.** The final image is distroless: only nginx, Node.js, our code, and their libraries from [Chainguard](https://www.chainguard.dev/) without Linux distribution around them. There is no shell, package manager, or `curl`, so attackers who run code in our server can’t run commands or download their tools.
2. **Pinned images and packages.** Base images, system packages, Node.js, and pnpm are fixed by hash or exact version. A new version can’t get into the image without our review (`pnpm update-docker` updates hashes).
3. **`.dockerignore` allow-list.** The image gets only the files from the allow-list, so secrets like `.env` from developer’s machine can’t get into the image by mistake ([`.dockerignore`](../../.dockerignore)).
4. **Multi-stage build.** Web client and server are built separately with only their own dependencies. A malicious web client dependency can’t change the server code, which has access to the database.
5. **No network in build.** Dependencies’ code never runs with internet access during the image build. Server has no build step, and web client is built without network. A malicious build tool can’t download the rest of the attack or send anything away.
6. **Non-root read-only container.** The server runs without root rights in a read-only container, so attackers who get into it can’t change our code or leave their files for later.
7. **Reproducible build.** Anyone can check that we run the published source code. The build is reproducible: building the image from the same commit gives the same files as in our published image. We use the same image for production and self-hosted servers, so there is only one image to check. CI checks it every week ([`test/reproducible.sh`](../../test/reproducible.sh)).
8. **Separated time-sensitive image.** Demo database and landing screenshots change on every build, so they come from a separated image, built every week by [Demo Database workflow](../../.github/workflows/demo-db.yml) and fixed by hash.

## Runtime

1. **Separated proxy domain.** App and CORS proxy run in separated containers on different domains. Content from any website, which proxy loads, can’t access the app’s storage.
2. **gVisor sandbox.** Pull request previews run unreviewed code, so they get even less: read-only file system, no Linux capabilities, and a gVisor sandbox between them and the server’s kernel on our [cloud](https://github.com/hplush/cloud).

## Web Client

A malicious dependency in the web client runs in the user’s browser with access to their data, so the browser limits what it can do:

1. **Content Security Policy.** The page runs only scripts from our domain and inline scripts with known hashes. A malicious dependency can’t load the rest of the attack from another server (`script-src` in Content Security Policy).
2. **Trusted Types.** Only a few known libraries can insert HTML into the page, and each of them must sanitize it first. A new dependency can’t create its own way to insert HTML or scripts, because the browser accepts only the names from our list (Trusted Types with `trusted-types` list in Content Security Policy).
3. **Default Trusted Types policy.** Web Worker and other script URLs must be from our domain (default Trusted Types policy in [`web/main/trusted-types.ts`](../../web/main/trusted-types.ts)).
4. **Frame and window isolation.** The page can’t be shown inside another website’s frame, can’t send forms to other domains, and other windows can’t get access to it. Attackers can’t trick the user into clicking on our page or read it from their own tab (`frame-ancestors`, `form-action`, and `Cross-Origin-Opener-Policy`).
5. **Non-extractable `CryptoKey`.** The encryption key of the user’s data is non-extractable `CryptoKey`. Scripts can use it to encrypt and decrypt while the page is open, but can’t read the key’s bytes. A malicious script can’t steal the key to decrypt the user’s data later on its own server.
6. **CORS.** The server answers only to our web client’s domain, and the CORS proxy works only for our domain. Another website can’t use the user’s session or our proxy (CORS with `WEB_ORIGIN` and `PROXY_ORIGIN`).
