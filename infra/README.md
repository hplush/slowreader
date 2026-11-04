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

- `ai` is the admin with `sudo`. Only Ansible uses it.
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
   1. `web`: inbound 80/tcp, 443/tcp, and 443/udp from any IPv4 and IPv6.
   2. `ssh`: without rules.
4. Open `ssh` firewall rules and copy page URL to `FIREWALL` in [`scripts/ssh-access.sh`](./scripts/ssh-access.sh).
5. Create a server in **Servers** → **Add Server**:
   1. Select **Nuremberg** location and **Ubuntu 26.04** image.
   2. Select **Cost Optimized** → **x86** → **CX23**: 2 vCPU, 4 GB RAM, 40 GB disk.
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
            - sk-ssh-ed25519@openssh.com AAAA…
      ```

   8. Enter `slowreader` name and click **Create & Buy now**.
6. Open the server’s **Console** and find `SSH HOST KEY FINGERPRINTS` in the boot log.
7. Save the server’s key in Dev Container and compare its fingerprint with the console:

   ```sh
   ssh-keyscan -t ed25519 SERVER_IPV4 | sed 's/^[^ ]*/slowreader.app/' > infra/known_hosts
   ssh-keygen -lf infra/known_hosts
   ```

8. Commit `infra/known_hosts`.

### Livepatch

1. Get Ubuntu Pro token at [ubuntu.com/pro](https://ubuntu.com/pro/dashboard).
2. Connect to the server:

   ```sh
   SERVER=SERVER_IPV4 ./infra/scripts/ssh.sh
   ```

3. Run `sudo pro attach` and follow its link to attach the server without typing the token.
4. Check that `sudo pro status` has `livepatch` enabled.

### Backup Bucket

1. In [Scaleway console](https://console.scaleway.com/) open **Object Storage** → **Create bucket**.
2. Select `Paris` (`fr-par`) region, enter `slowreader-backups` name, select **Private** visibility, and enable **Object Lock** (it enables versioning too).
3. In bucket **Settings** set default Object Lock retention: **Compliance** mode, **14 days**.
4. In **Lifecycle rules** add a rule to delete noncurrent versions after **15 days**.
5. Create `backup` IAM application with policy for `Slow Reader` project: **Object Storage** → `ObjectStorageObjectsDelete`, `ObjectStorageObjectsRead`, `ObjectStorageObjectsWrite`, `ObjectStorageBucketsRead`.
6. Create API key for `backup` application without expiration. Keep the window open for the next section.

### Secrets

Ansible skips parts, which need secrets, until you create them on the server. Secrets go from `openssl rand` straight to files or Podman secrets, so nobody sees them.

1. Run Ansible the first time:

   ```sh
   SERVER=SERVER_IPV4 ./infra/scripts/ansible.sh
   ```

2. Connect to the server like in the Livepatch section.
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

Connect our Grafana on `dashboard.hplush.dev`, which [hplush/cloud](https://github.com/hplush/cloud) deploys.

1. Add 2 Prometheus data sources to `group_vars/all.yml` of `hplush/cloud`: `https://metrics.slowreader.app` for the server and `https://metrics.slowreader.app/product` for the app.
2. Encrypt the token without showing it. Run it from Slow Reader repository with `hplush/cloud` next to it:

   ```sh
   ./infra/scripts/ssh.sh sudo sed -n 's/^METRICS_TOKEN=//p' /etc/slowreader/caddy.env | (cd ../cloud && ansible-vault encrypt_string --stdin-name dashboards_slowreader_metrics_token)
   ```

3. Put the output into `group_vars/all.yml` of `hplush/cloud`.
4. Add alert rules. Set **no data** and **error** to **Alerting** for all of them, since a frozen server sends nothing.
   - Server frozen: `up{job="node"} < 1` for 5 minutes.
   - App down: `max(up{job="app"}) < 1` from `/product` data source.
   - PostgreSQL down: `pg_up < 1`.
   - Failed systemd unit: `node_systemd_unit_state{state="failed"} == 1`. It covers Caddy, PostgreSQL, backups, and restore test.
   - Container restarts: `increase(systemd_service_restart_total[1h]) > 3`.
   - Disk: `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.2`.
   - Memory: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1` for 10 minutes.
   - WAL archiving fails: `increase(pg_stat_archiver_failed_count[1h]) > 0`. Without it, backups miss the latest changes.
   - Backup failed: `slowreader_backup_run_timestamp_seconds - slowreader_backup_success_timestamp_seconds > 0`. It fires right after a failed backup or restore test.
   - Backups too old: `time() - slowreader_backup_success_timestamp_seconds{job=~"full|diff"} > 2 * 86400`.
   - Restore test too old: `time() - slowreader_backup_success_timestamp_seconds{job="restore-test"} > 8 * 86400`.
   - Server errors: `sum(rate(caddy_http_request_duration_seconds_count{code=~"5.."}[5m])) > 0.1` for 5 minutes.
   - Crash spike: `increase(slowreader_events_total{name="fatal-crash"}[1h]) > 10` from `/product` data source.
5. Send alerts to a contact point without SMTP, like a Telegram bot. Put its token to `hplush/cloud` by `ansible-vault` like the metrics token.

### DNS

`slowreader.app` zone is on Netim with DNSSEC. Edit records manually in Netim and run `node infra/scripts/dump-dns.ts` after it.

Records:

- `slowreader.app` CAA `0 issue "letsencrypt.org"`, `0 issuewild ";"`, and `0 iodef "mailto:andrey@sitnik.es"`.
- `slowreader.app` TXT `v=spf1 -all`, since the domain sends no mail.
- `_dmarc.slowreader.app` TXT `v=DMARC1; p=reject; adkim=s; aspf=s`.
- `slowreader.app` MX `0 .` (null MX).
- A and AAAA of the server for `slowreader.app`, `proxy`, and `metrics`.
- A `91.98.155.169` and AAAA `2a01:4f8:c012:2e6f::1` for `dev`, our staging on [hplush/cloud](https://github.com/hplush/cloud).
- HTTPS `1 . alpn=h3,h2` for `slowreader.app`, `proxy`, and `dev`.
- `proxy.dev` CNAME `dev.slowreader.app.`

We don’t use ECH for now: dedicated IP reveals the site anyway, and Netim has no Caddy DNS plugin to rotate ECH keys.
