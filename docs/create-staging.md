# Creating Staging Server

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

Add `CNAME` for `admin` to `hplush.dev`.

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

Set `admin.hplush.dev` in `/dashboard/settings/server`.

Add Docker access to admin user.

```bash
sudo usermod -aG docker ai
```
