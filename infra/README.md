# Slow Reader Infrastructure

Production runs on our own Hetzner Cloud VM with Ubuntu 26.04 and Livepatch. App and proxy run in rootless Podman behind Caddy, PostgreSQL comes from Ubuntu, and pgBackRest keeps encrypted backups in Scaleway Object Storage.

[Ansible](https://docs.ansible.com) configures the server. We create the VM, DNS records, and backup bucket manually by this guide.

## Apply Changes

Run it inside Dev Container:

```sh
./infra/scripts/ansible.sh
```

Add `--check --diff` to see changes without applying them.

## Files

- [`playbook.yml`](./playbook.yml): Ansible playbook with services, their ports, and environment. Test VM overrides `domain` and `backup_bucket` by `-e`.
- [`tasks/`](./tasks/): playbook steps for base system, SSH, firewall, Caddy, PostgreSQL, containers, metrics, and backups.
- [`files/`](./files/) and [`templates/`](./templates/): configs, systemd units, and scripts, which Ansible copies to the server.
- [`inventory.yml`](./inventory.yml) and [`ansible.cfg`](./ansible.cfg): server address and SSH settings.
- `known_hosts`: server’s SSH host key, so SSH never trusts another server.
- [`dns.txt`](./dns.txt): dump of `slowreader.app` DNS records. [DNS workflow](../.github/workflows/dns.yml) checks it every day.
- [`scripts/ssh-access.sh`](./scripts/ssh-access.sh): asks to allow your IPv4 in Hetzner Cloud Firewall if it changed since the last run (saved in ignored `.ssh-ip`), and runs the command.
- [`scripts/ssh.sh`](./scripts/ssh.sh): connects to the server as admin through `ssh-access.sh`, with a command or a shell.
- [`scripts/ansible.sh`](./scripts/ansible.sh): runs the playbook inside `ssh-access.sh`.
- [`scripts/deploy.sh`](./scripts/deploy.sh): asks the server to deploy the version, [`scripts/release.sh`](../scripts/release.sh) calls it.
- [`scripts/dump-dns.ts`](./scripts/dump-dns.ts): updates `dns.txt`, `--check` fails on difference.

## Architecture

### Access

Hetzner Cloud Firewall `ssh` allows port 22 only from maintainers’ IPv4. `ssh-access.sh` asks you to update the rule when your IPv4 changes.

SSH accepts only hardware keys from [`verifier/allowed_signers`](../verifier/allowed_signers):

- `ai` is the admin. `sudo` asks its password from the maintainer’s password manager.
- `deploy` has no `sudo` and no shell. Its key can only call `deploy-request`, which accepts `request VERSION` and `status VERSION`.

### Deploy

1. `deploy-request` creates a file with the version in `/srv/deploy/slowreader-app/requests/` and `/srv/deploy/slowreader-proxy/requests/`. Only `deploy` and the service’s user can write to its folder.
2. It triggers `deploy.path` systemd unit of `slowreader-app` and `slowreader-proxy` users, which starts `deploy-service` under its service user.
3. `deploy-service` downloads [verifier’s](../verifier/) result for the version, checks its signature by pinned [`cosign.pub`](../verifier/cosign.pub), and takes the image digest only from the signed result.
4. Each service has 2 containers, blue and green, and only one of them runs. It starts the stopped one with the new image, waits for `/health` and for Caddy’s health check, and stops the old one. Caddy moves traffic by itself.
5. It removes unused images and writes `ok` or `fail` with the log to `/srv/deploy/SERVICE/results/VERSION`.

### Containers

Quadlet units in `/etc/containers/systemd/users/` run blue and green containers of each service, like `slowreader-app-blue`, from local images like `localhost/slowreader:slowreader-app-blue`. Containers can’t change their files or use any root rights (read-only file system without Linux capabilities).

`Pull=never` stops Podman from downloading images: only `deploy-service` puts verified images there. App gets `DATABASE_URL` and `ANALYTICS_TOKEN` from Podman secrets of `slowreader-app` user and connects to PostgreSQL by Unix socket.

nftables blocks `slowreader-proxy` user from loopback, private networks, and Hetzner metadata, so the proxy can’t load our internal services.

### Self-Healing

- Container health check kills an unhealthy container and systemd restarts it.
- Kernel panics and lockups reboot the server. systemd pings `softdog` watchdog, since Hetzner VM has no watchdog device.
- `unattended-upgrades` installs updates from Ubuntu, Ubuntu Pro, and Caddy repository every day. `needrestart` restarts services.
- `reboot-if-needed.timer` reboots at 05:00 UTC only if Livepatch can’t protect the running kernel.
- Grafana alerts on failed `/health` for a full freeze. Reset the server in Hetzner console.

### Metrics

Two VictoriaMetrics instances on loopback scrape every minute.

It keeps app’s `/metrics` for 10 years and server tech metrics (node, PostgreSQL, Caddy, container units, and backup results) for 1 year.

[Our Grafana](https://github.com/hplush/cloud) on `dashboard.hplush.dev` reads both through `metrics.slowreader.app` and `metrics.slowreader.app/product` with a token and IP allowlist.

### Backups

pgBackRest encrypts the database on the server and uploads it to `slowreader-backups` bucket in Scaleway Object Storage.

The key is only on the server and in the maintainer’s personal password manager, so Scaleway can’t read backups.

- Full copy every Sunday and changes since the last full copy on other days. We keep the last 2 full copies with their changes.
- PostgreSQL writes every change to a log (WAL) before applying it. pgBackRest uploads this log continuously, so we can restore the database to any minute, not only to the last copy.

The bucket keeps every deleted or overwritten file for 14 days, and nobody can delete them earlier, even with our Scaleway keys (versioning with Object Lock). Attackers on our server can’t destroy old backups.

Every Sunday `restore-test.timer` restores the latest copy to a temporary folder, starts PostgreSQL there, and checks that the database has users.

## Accidents

Connect to the server for all commands below:

```sh
./infra/scripts/ssh.sh
```

Commands for `slowreader-app` user work for `slowreader-proxy` too, if you replace the name.

### Server Doesn’t Answer

Reset it in Hetzner console: open the server, **Power** → **Reset**. Watchdog should do it by itself, so check `sudo journalctl -b -1 -n 100 --no-pager` for the reason after the reboot.

### Find the Problem

1. Failed units:

   ```sh
   systemctl --failed
   sudo -u slowreader-app XDG_RUNTIME_DIR=/run/user/$(id -u slowreader-app) systemctl --user --failed
   ```

2. Running color and containers:

   ```sh
   sudo cat /home/slowreader-app/.local/state/slowreader-color
   sudo podman-as slowreader-app ps --all
   ```

3. Logs:

   ```sh
   # App or proxy container
   sudo journalctl CONTAINER_NAME=slowreader-app-blue -n 200 --no-pager
   # Everything of app user: containers, deploy, health checks
   sudo journalctl _UID=$(id -u slowreader-app) -n 200 --no-pager
   # Last deploy
   sudo cat /srv/deploy/slowreader-app/results/VERSION
   # Caddy, PostgreSQL, backups, and restore test
   sudo journalctl -u caddy -n 200 --no-pager
   sudo tail -n 200 /var/log/postgresql/postgresql-*-main.log
   sudo journalctl -u pgbackrest@full -u pgbackrest@diff -u restore-test -n 200 --no-pager
   ```

   Add `-f` to `journalctl` to watch new lines.

4. Disk and memory:

   ```sh
   df -h /
   free -h
   sudo du -xh / --max-depth=3 | sort -h | tail -n 20
   ```

   Free the disk by `sudo journalctl --vacuum-size=200M` and `sudo podman-as slowreader-app image prune --all --force`.

### Restart a Container

```sh
sudo -u slowreader-app XDG_RUNTIME_DIR=/run/user/$(id -u slowreader-app) systemctl --user restart slowreader-app-$(sudo cat /home/slowreader-app/.local/state/slowreader-color).service
```

### Roll Back a Release

Deploy the previous version from outside of Dev Container:

```sh
./infra/scripts/ssh-access.sh ./infra/scripts/deploy.sh PREVIOUS_VERSION
```

It doesn’t roll back database migrations. If the new version changed the database, restore it too.

### Restore Database

pgBackRest can restore to the latest change or to any minute in the last 2 weeks. Restore to the past loses changes after this time, and clients, which synced them, will have data, which the server doesn’t know.

1. Check available backups:

   ```sh
   sudo -u postgres pgbackrest --stanza=slowreader info
   ```

2. Stop the app and PostgreSQL:

   ```sh
   sudo -u slowreader-app XDG_RUNTIME_DIR=/run/user/$(id -u slowreader-app) systemctl --user stop slowreader-app-blue.service slowreader-app-green.service
   sudo systemctl stop postgresql
   ```

3. Restore the latest state:

   ```sh
   sudo -u postgres pgbackrest --stanza=slowreader --delta restore
   ```

   Or restore to the time before the accident:

   ```sh
   sudo -u postgres pgbackrest --stanza=slowreader --delta --type=time '--target=2026-11-04 12:00:00+00' --target-action=promote restore
   ```

4. Start PostgreSQL and check the data:

   ```sh
   sudo systemctl start postgresql
   sudo -u postgres psql -d slowreader -c 'SELECT count(*) FROM users'
   ```

5. Start the app:

   ```sh
   sudo -u slowreader-app XDG_RUNTIME_DIR=/run/user/$(id -u slowreader-app) systemctl --user start slowreader-app-$(sudo cat /home/slowreader-app/.local/state/slowreader-color).service
   ```

6. Restore to the past starts a new history of changes, so make a full backup:

   ```sh
   sudo systemctl start pgbackrest@full.service
   ```

### Lost Server

1. Create a new server by Setup section below up to the first Ansible run. Use a [Primary IP](https://docs.hetzner.com/cloud/servers/primary-ips/overview/) of the old server to keep DNS, or change A and AAAA records.
2. Create secrets by Secrets section, but in step 6 use Scaleway keys and the passphrase from the password manager instead of the new one.
3. Restore the database by steps 2–4 of Restore Database section above. It brings back the old database password, so repeat step 3 of Secrets section after it. `podman secret create` needs `--replace` there.
4. Run Ansible again and deploy the latest release.

## Setup

You need these steps only once.

### Hetzner

1. Add a hardware key as the second factor in Hetzner account.
2. Create `Slow Reader` project in [Hetzner Console](https://console.hetzner.com/).
3. Create firewalls in **Firewalls**:
   1. `Web`: inbound ICMP, 80/tcp, 443/tcp, and 443/udp from any IPv4 and IPv6.
   2. `SSH`: without rules.
4. Open `ssh` firewall rules and copy page URL to `FIREWALL` in [`scripts/ssh-access.sh`](./scripts/ssh-access.sh).
5. Create a server in **Servers** → **Add Server**:
   1. Select **Cost Optimized** → **x86** → **CX23**: 2 vCPU, 4 GB RAM, 40 GB disk.
   2. Select **Falkenstein** location and **Ubuntu 26.04** image.
   3. Enable public IPv4 and IPv6.
   4. Add your hardware key from `verifier/allowed_signers` in **SSH keys**.
   5. Select `web` and `ssh` firewalls.
   6. Enable **Backups** as the last resort, if Ansible breaks the server.
   7. Put to **Cloud config**, with your key from `verifier/allowed_signers`.

      ```yaml
      #cloud-config
      users:
        - name: ai
          groups: sudo
          shell: /bin/bash
          sudo: ALL=(ALL) NOPASSWD:ALL
          ssh_authorized_keys:
            - sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaC1lZDI1NTE5QG9wZW5zc2guY29tAAAAICdU+eT8ehMEMpILicrcF1Uxv2Sj7MSIuwhTaJfRvcOpAAAABHNzaDo= andrey@sitnik.ru
      ```

      Ansible replaces `NOPASSWD` by a password after Admin Password section.

   8. Enter `slowreader` name and click **Create & Buy now**.
6. Save the server’s key:

   ```sh
   ssh-keyscan -t ed25519 SERVER_IPV4 | sed 's/^[^ ]*/slowreader.app/' > infra/known_hosts
   ```

7. Commit `infra/known_hosts`.

### Admin Password

Generate a password for `ai` in the password manager. Connect and set it:

```sh
SERVER=SERVER_IPV4 ./infra/scripts/ssh.sh
sudo passwd ai
```

### Livepatch

1. Get Ubuntu Pro token at [ubuntu.com/pro](https://ubuntu.com/pro/dashboard).
2. Connect to the server:

   ```sh
   SERVER=SERVER_IPV4 ./infra/scripts/ssh.sh
   ```

3. Run `sudo pro attach` and follow its link to attach the server without typing the token.

### Backup Bucket

1. In [Scaleway console](https://console.scaleway.com/) open **Object Storage** → **Create bucket**.
2. Select `Paris` (`fr-par`) region, enter `slowreader-backups` name, select **Private** visibility, and enable **Object Lock** (it enables versioning too).
3. Enable bucket encryption with Scaleway-managed keys (**SSE-ONE**). pgBackRest already encrypts the files, so it is only the second layer. Don’t use own keys (**SSE-KMS**): deleted key would make backups unreadable.
4. Lock every new file for 14 days, so even our hacked server can’t delete backups. Console can’t set it, so create a 1 hour API key for your user and run in Dev Container:

   ```sh
   read -rs KEY
   read -rs SECRET
   BODY='<ObjectLockConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><ObjectLockEnabled>Enabled</ObjectLockEnabled><Rule><DefaultRetention><Mode>COMPLIANCE</Mode><Days>14</Days></DefaultRetention></Rule></ObjectLockConfiguration>'
   curl -fsS --aws-sigv4 aws:amz:fr-par:s3 --user "$KEY:$SECRET" -X PUT -H "Content-MD5: $(printf %s "$BODY" | openssl dgst -md5 -binary | base64)" --data "$BODY" 'https://slowreader-backups.s3.fr-par.scw.cloud/?object-lock'
   unset KEY SECRET
   ```

   Console shows **Compliance for 14 days** in **Object lock** of bucket’s settings.

5. In **Lifecycle rules** add `delete-old-versions` rule for all objects with **Expire non-current versions of objects** after **15** days and **Expire incomplete multipart uploads** after **1** day.
6. Create `backup` IAM application with policy for `Slow Reader` project: **Object Storage** → `ObjectStorageObjectsDelete`, `ObjectStorageObjectsRead`, `ObjectStorageObjectsWrite`, `ObjectStorageBucketsRead`.
7. Create API key for `backup` application without expiration. Keep the window open for the next section.

### Secrets

Ansible skips parts, which need secrets, until you create them on the server.

1. Run Ansible the first time:

   ```sh
   SERVER=SERVER_IPV4 ./infra/scripts/ansible.sh
   ```

2. Connect to the server `./infra/scripts/ssh.sh`.
3. Set database password:

   ```sh
   PASSWORD=$(openssl rand -hex 32)
   printf "ALTER ROLE slowreader PASSWORD '%s'" "$PASSWORD" | sudo -u postgres psql -q
   printf 'postgres://slowreader:%s@localhost/slowreader?host=/run/postgresql' "$PASSWORD" | sudo podman-as slowreader-app secret create database_url -
   unset PASSWORD
   ```

4. Create token for app’s `/metrics`:

   ```sh
   TOKEN=$(openssl rand -hex 32)
   printf %s "$TOKEN" | sudo podman-as slowreader-app secret create analytics_token -
   printf %s "$TOKEN" | sudo sh -c 'umask 077 && cat > /etc/slowreader/analytics-token'
   unset TOKEN
   ```

5. Create token for Grafana:

   ```sh
   { printf 'METRICS_TOKEN='; openssl rand -hex 32; } | sudo sh -c 'umask 077 && cat > /etc/slowreader/caddy.env'
   ```

6. Paste Scaleway access and secret keys of `backup` application into these commands, which don’t save them to the shell history, and generate backup passphrase:

   ```sh
   read -rs KEY
   read -rs SECRET
   PASSPHRASE=$(openssl rand -base64 48)
   printf '[global]\nrepo1-s3-key=%s\nrepo1-s3-key-secret=%s\nrepo1-cipher-pass=%s\n' "$KEY" "$SECRET" "$PASSPHRASE" | sudo -u postgres sh -c 'umask 077 && cat > /etc/pgbackrest/conf.d/secrets.conf'
   echo "$PASSPHRASE"
   unset KEY SECRET PASSPHRASE
   ```

7. Save the passphrase to the password manager and clear the terminal. We can’t read backups without it.
8. Disconnect and run Ansible again. It will create the backup repository and enable all services.
9. Connect to SSH and run the first backup and restore test:

   ```sh
   sudo systemctl start pgbackrest@full.service restore-test.service
   ```

### Grafana

Our Grafana on `dashboard.hplush.dev` is deployed by [hplush/cloud](https://github.com/hplush/cloud). It has `Slow Reader Server` and `Slow Reader App` data sources for `https://metrics.slowreader.app` and `/product`, dashboards, and alerts to Telegram. They turn on when their tokens in `group_vars/all.yml` aren’t empty.

1. In Slow Reader Dev Container print the metrics token:

   ```sh
   ./infra/scripts/ssh.sh sudo sed -n 's/^METRICS_TOKEN=//p' /etc/slowreader/caddy.env
   ```

2. In `hplush/cloud` Dev Container paste it to `read`:

   ```sh
   read -rs TOKEN
   printf %s "$TOKEN" | ansible-vault encrypt_string --stdin-name dashboards_metrics_token
   unset TOKEN
   ```

3. Clear the first terminal. Replace `dashboards_metrics_token: ''` by the output.
4. Create Telegram bot by [@BotFather](https://t.me/BotFather), encrypt its token the same way as `dashboards_telegram_token`, and put chat ID to `dashboards_telegram_chat`.
5. Deploy `hplush/cloud`.
