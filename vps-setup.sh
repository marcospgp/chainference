#!/bin/bash
set -euo pipefail

# Script used to initialize VPS.
# Designed to be idempotent, so it can be run multiple times when iterating.
#
# Usage:
#   1. Create VPS.
#   2. SSH in as root user.
#   3. Run "nano setup.sh", paste the contents of this file, and save.
#   4. Run "bash setup.sh".

SUDO_USERS=(
  "bernardo:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBesw1jrqTa2CepHsk35RX1wZeT5CCM1hBgbS8KDLS9D bfar97@gmail.com"
  "marcos:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGJ2vrIhoGkV+8kath2C3utUJ8zymmascDMWpLQs1Yrr email@marcospereira.me"
)

OTHER_USERS=(
  "github:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDR7JRuR3FgsI2RRqtb5mS00jO/emFGS0cyM3M1n6Up2 github"
)

# Paste VPS private SSH key here! (between the lines containing "EOF")
# The corresponding public key should be given read access to relevant repos.
PRIVATE_SSH_KEY=$(
  cat <<'EOF'
EOF
)

# Ensure private SSH key is set.
[ -z "$PRIVATE_SSH_KEY" ] && {
  echo "Error: \$PRIVATE_SSH_KEY variable not set."
  exit 1
}

printf "\n\n=================================================================================\n"
printf "Miscellaneous"
printf "\n=================================================================================\n\n"

# Update packages
apt-get update -y
apt-get dist-upgrade -y

timedatectl set-timezone UTC

# Reboot on kernel panic
if ! grep -q "^kernel.panic = 1$" /etc/sysctl.conf; then
  echo "kernel.panic = 1" >>/etc/sysctl.conf
  sysctl -p
fi

# Rotate logs
apt-get install -y logrotate
if [ ! -f /etc/logrotate.d/custom ]; then
  cat <<'EOF' >/etc/logrotate.d/custom
/var/log/*.log
{
    size 5M
    rotate 1
    missingok
    notifempty
    nocompress
    copytruncate
}
EOF
fi

printf "\n\n=================================================================================\n"
printf "Security"
printf "\n=================================================================================\n\n"

# SSH hardening
modify_ssh_config() {
  local param="$1"
  local value="$2"
  local file="/etc/ssh/sshd_config"

  if grep -qE "^#?$param" "$file"; then
    sed -i "s/^#\?$param.*/$param $value/" "$file"
  else
    echo "$param $value" >>"$file"
  fi
}
modify_ssh_config "PermitRootLogin" "no"
modify_ssh_config "PasswordAuthentication" "no"
modify_ssh_config "PubkeyAuthentication" "yes"
systemctl restart ssh

# Lock root password.
passwd --lock root

# Sysctl hardening
add_sysctl() {
  local key="$1"
  local value="$2"
  local file="/etc/sysctl.conf"

  if ! grep -q "^$key = $value$" "$file"; then
    echo "$key = $value" >>"$file"
  fi
}
add_sysctl "net.ipv4.conf.all.accept_redirects" "0"
add_sysctl "net.ipv4.conf.all.send_redirects" "0"
add_sysctl "net.ipv4.conf.all.rp_filter" "1"
add_sysctl "net.ipv4.tcp_syncookies" "1"
add_sysctl "net.ipv4.conf.all.log_martians" "1"
add_sysctl "net.ipv4.conf.all.accept_source_route" "0"
sysctl -p

# fail2ban
apt-get install -y fail2ban
cat <<'EOF' >/etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = auto

[sshd]
enabled = true
EOF
cat <<'EOF' >/etc/fail2ban/jail.d/recidive.conf
[recidive]
enabled = true
filter = recidive
logpath = /var/log/fail2ban.log
maxretry = 5
bantime = 1w
EOF
systemctl restart fail2ban

systemctl restart fail2ban
systemctl enable --now fail2ban

# Enable firewall.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

printf "\n\n=================================================================================\n"
printf "Create users"
printf "\n=================================================================================\n\n"

create_user_if_not_exists() {
  local USERNAME="$1"
  local AUTHORIZED_KEY="$2"

  if ! id "$USERNAME" &>/dev/null; then
    adduser --disabled-password --gecos "" "$USERNAME"
    mkdir -p "/home/$USERNAME/.ssh"
    echo "$AUTHORIZED_KEY" >"/home/$USERNAME/.ssh/authorized_keys"
    chmod 700 "/home/$USERNAME/.ssh"
    chmod 600 "/home/$USERNAME/.ssh/authorized_keys"
    chown -R "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"
  fi
}

# Create users.
for user in "${SUDO_USERS[@]}" "${OTHER_USERS[@]}"; do
  IFS=":" read -r username user_key <<<"$user"
  create_user_if_not_exists "$username" "$user_key"
done

# Add sudo privileges to sudo users.
for user in "${SUDO_USERS[@]}"; do
  echo "$username ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/$username"
  chmod 0440 "/etc/sudoers.d/$username"
done

printf "All users created successfully.\n"

printf "\n\n=================================================================================\n"
printf "Set up github user"
printf "\n=================================================================================\n\n"

if [ ! -f /home/github/.ssh/id_ed25519 ]; then
  # Store "github" user's private SSH key.
  cat <<EOF >/home/github/.ssh/id_ed25519
$PRIVATE_SSH_KEY
EOF
  chmod 600 /home/github/.ssh/id_ed25519
fi

# Add github to allowed hosts.
touch /home/github/.ssh/known_hosts
if ! grep -q "github.com" /home/github/.ssh/known_hosts; then
  ssh-keyscan -t ed25519 github.com >>/home/github/.ssh/known_hosts
fi
chown -R github:github /home/github/.ssh

# Ensure /srv exists and grant full access to the github user.
# This is where projects should live.
mkdir -p /srv
chown -R github:github /srv
chmod -R 755 /srv

# Allow github user to run only specific docker commands.
echo "github ALL=(ALL) NOPASSWD: /usr/bin/docker compose up *, /usr/bin/docker compose down *" >/etc/sudoers.d/github
chmod 0440 /etc/sudoers.d/github

printf "\n\n=================================================================================\n"
printf "Unattended upgrades"
printf "\n=================================================================================\n\n"

apt-get install -y unattended-upgrades

modify_config() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -qE "^$key" "$file"; then
    sed -i "s/^$key.*/$key $value/" "$file"
  else
    echo "$key $value" >>"$file"
  fi
}

modify_config "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::Update-Package-Lists" "\"1\";"
modify_config "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::Unattended-Upgrade" "\"1\";"
modify_config "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::RandomSleep" "\"3600\";"
modify_config "/etc/apt/apt.conf.d/50unattended-upgrades" "Unattended-Upgrade::Automatic-Reboot" "\"true\";"
# Reboot at 12 noon UTC, when america is sleeping.
modify_config "/etc/apt/apt.conf.d/50unattended-upgrades" "Unattended-Upgrade::Automatic-Reboot-Time" "\"12:00\";"

systemctl enable --now unattended-upgrades
unattended-upgrades --dry-run

printf "\n\n=================================================================================\n"
printf "Set up docker"
printf "\n=================================================================================\n\n"

# Steps copied from https://docs.docker.com/engine/install/ubuntu/ (removed sudo)
if ! command -v docker &>/dev/null; then
  # Add Docker's official GPG key:
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  # Add the repository to Apt sources:
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" |
    tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update

  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
fi

# Add sudo users to the docker group.
for user in "${SUDO_USERS[@]}"; do
  IFS=":" read -r username user_key <<<"$user"
  if id "$username" &>/dev/null; then
    usermod -aG docker "$username"
  fi
done

# Avoid arbitrarily large docker logs.
mkdir -p /etc/docker

cat <<'EOF' >/etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "1"
  }
}
EOF

systemctl restart docker

printf "\n\n=================================================================================\n"
printf "Final cleanup"
printf "\n=================================================================================\n\n"

apt-get autoremove -y
apt-get clean

printf "\n\n=================================================================================\n"
printf "Setup script ran successfully."
printf "\n=================================================================================\n\n"

if [ -f /var/run/reboot-required ]; then
  printf "A system restart is required.\n"
  read -p "Would you like to restart now? (y/N): " -r REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    printf "\nRestarting now...\n"
    reboot
  else
    printf "\nRestart skipped. Remember to restart later.\n"
  fi
else
  printf "\nNo restart required.\n"
fi
