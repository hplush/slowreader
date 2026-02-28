# Creating Server

We are using own virtual server with [Dokploy](https://dokploy.com/) for staging.

## 1. Create Virtual Server

Create some cheap server with 4 GB memory.

Create firewall rules:

- `ICMP` open for everyone
- `TCP 80` open for everyone
- `TCP 443` open for everyone
- `TCP 22` only for admin’s IP address
- `TCP 3000` only for admin’s IP address

## 2. Set DNS Records

Get new server IP4 and IP6 address.

Add `A` and `AAAA` DNS record for `hplush.dev`.

Add `CNAME` for `cloud` to `hplush.dev`.

## 3. Create Admin Account

Connect to the server by IP address: `ssh root@hplush.dev`

Update system:

```bash
apt update && apt upgrade -y
```

Add custom user and disconnect.

```bash
sudo adduser ai
sudo usermod -aG sudo ai
mkdir -p /home/ai/.ssh
cp /root/.ssh/authorized_keys /home/ai/.ssh/
chown -R ai:ai /home/ai/.ssh
chmod 700 /home/ai/.ssh
chmod 600 /home/ai/.ssh/authorized_keys
exit
```

## 4. Improve Security

Connect with new user and DNS name: `ssh ai@hplush.dev`.

Install basic tools:

```sh
sudo apt-get install micro
```

Set bash settings by adding to `micro ~/.bashrc`:

```bash
export PS1="\n\e[01;31m\h \e[01;36m\w\n\e[0;32m❯\e[m "
alias ..='cd ..'
alias cat='bat --plain'
alias rg='rg --hidden'
```

Disable `root` SSH access and text password in `sudo micro /etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
```

Install tool to prevent SSH brute-force:

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

Create `/etc/fail2ban/jail.local` config:

```toml
[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
mode     = aggressive
maxretry = 3
findtime = 1h
bantime  = 24h
```

Reboot the system:

```
sudo reboot now
```

## 5. Auto-Updates

Get token for [Ubuntu Pro](https://ubuntu.com/pro).

Enable auto-update with kernel live patch:

```bash
sudo apt install ubuntu-advantage-tools -y
sudo pro attach YOUR_TOKEN
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 6. Install Dokploy

Run script:

```bash
curl -sSL https://dokploy.com/install.sh | sudo sh
```

Create account in web UI.

Set `cloud.hplush.dev` in `/dashboard/settings/server`.

Add Docker access to admin user.

```bash
sudo usermod -aG docker ai
```

## 7. Create Project

Create domains:

- `dev.slowreader.app`: `A`/`AAAA` to server’s IP addresses.
- `server.dev.slowreader.app`: `CNAME` to `dev.slowreader.app`.
- `proxy.dev.slowreader.app`: `CNAME` to `dev.slowreader.app`.
- `*.app.hplush.dev`: `CNAME` to `dev.slowreader.app`.

Create `Slow Reader` organization with `Slow Reader Dev` project.

Create `Web` application with `slowreader-dev-web` name and `dev.slowreader.app` domain to `8000` domain with HTTPS. Enable Docker deployment from `ghcr.io/hplush/slowreader-web:dev`.

Create `Database` of `postgres:18` with `slowreader-dev-database` name.

Create `Server` application with `slowreader-dev-server` name and `server.dev.slowreader.app` domain to `2554` domain with HTTPS. Enable Docker deployment from `ghcr.io/hplush/slowreader:dev`. Environment variables:

```env
ASSETS=
PROXY_ORIGIN=
DATABASE_URL=<COPY FROM DATABASE UI>
```

Create `Proxy` application with `slowreader-dev-proxy` name and `proxy.dev.slowreader.app` domain to `5284` domain with HTTPS. Enable Docker deployment from `ghcr.io/hplush/slowreader-proxy:dev`. Environments:

```env
STAGING=1
PROXY_ORIGIN=^https:\/\/dev\.slowreader\.app$
```

Install GitHuh application and enable Preview Deployments for `Server` with for `*.app.hplush.dev` with:

```env
ASSETS=1
DATABASE_URL=memory://
PROXY_ORIGIN=^https:\/\/preview-\w+.app\.hplush\.dev$
```

Copy application ID (last part of application’s URL) to `applicationId` in GitHub workflows.

Create new token in Dokploy and set as `DOKPLOY_TOKEN` secret in GitHub.
