#!/bin/bash
set -euo pipefail

# Script used to initialize VPS.
# Usage:
#   1. Create VPS
#   2. SSH in as root user
#   3. Copy script into file in VPS, updating variables below
#   4. Run the script file with the "bash" command.

SUDO_USERS=(
  "bernardo:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBesw1jrqTa2CepHsk35RX1wZeT5CCM1hBgbS8KDLS9D bfar97@gmail.com"
  "marcos:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGJ2vrIhoGkV+8kath2C3utUJ8zymmascDMWpLQs1Yrr email@marcospereira.me"
)

DOCKER_ONLY_USERS=(
  "github:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDR7JRuR3FgsI2RRqtb5mS00jO/emFGS0cyM3M1n6Up2 github"
)

GITHUB_PRIVATE_KEY=$(
  cat <<'EOF'
Paste VPS private SSH key here!
The corresponding public key should be given read access to relevant repos.
EOF
)

printf "\n\n=================================================================================\n"
printf "Miscellaneous"
printf "\n=================================================================================\n\n"

# Update packages
apt update -y
apt dist-upgrade -y

timedatectl set-timezone UTC

# Reboot on kernel panic
if ! grep -q "^kernel.panic = 1$" /etc/sysctl.conf; then
  echo "kernel.panic = 1" >>/etc/sysctl.conf
  sysctl -p
fi

# Rotate logs
apt install -y logrotate
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
sysctl -p

# fail2ban
apt install -y fail2ban
if [ ! -f /etc/fail2ban/jail.local ]; then
  cat <<'EOF' >/etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = auto

[sshd]
enabled = true
EOF
fi
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

create_user() {
  local USERNAME="$1"
  local AUTHORIZED_KEY="$2"

  if ! id "$USERNAME" &>/dev/null; then
    adduser --disabled-password --gecos "" "$USERNAME"
    mkdir -p "/home/$USERNAME/.ssh"
    echo "$AUTHORIZED_KEY" >"/home/$USERNAME/.ssh/authorized_keys"
    chmod 700 "/home/$USERNAME/.ssh"
    chmod 600 "/home/$USERNAME/.ssh/authorized_keys"
    chown -R "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/$USERNAME"
  fi
}

for user in "${USERS[@]}"; do
  IFS=":" read -r username user_key <<<"$user"
  create_user "$username" "$user_key"
done

printf "All users created successfully.\n"

printf "\n\n=================================================================================\n"
printf "Set up github user"
printf "\n=================================================================================\n\n"

if [ ! -f /home/github/.ssh/id_ed25519 ]; then
  # Store "github" user's private SSH key.
  cat <<EOF >/home/github/.ssh/id_ed25519
$GITHUB_PRIVATE_KEY
EOF
  chmod 600 /home/github/.ssh/id_ed25519

  # Add github to allowed hosts.
  touch /home/github/.ssh/known_hosts
  if ! grep -q "github.com" /home/github/.ssh/known_hosts; then
    ssh-keyscan -t ed25519 github.com >>/home/github/.ssh/known_hosts
  fi
  chown -R github:github /home/github/.ssh
fi

# Ensure correct ownership for everything in .ssh
chown -R github:github /home/github/.ssh

printf "\n\n=================================================================================\n"
printf "Unattended upgrades"
printf "\n=================================================================================\n\n"

apt install -y unattended-upgrades

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

# Add users to the docker group
for user in "${USERS[@]}"; do
  IFS=":" read -r username user_key <<<"$user"
  if id "$username" &>/dev/null; then
    usermod -aG docker "$username"
  fi
done

# Avoid arbitrarily large docker logs.
configure_docker_logs() {
  local CONFIG="/etc/docker/daemon.json"
  local MAX_SIZE="5m"
  local MAX_FILE="1"

  touch "$CONFIG"
  # If CONFIG is empty, initialize it as an empty JSON object
  if [ ! -s "$CONFIG" ]; then
    echo '{}' >"$CONFIG"
  fi

  apt-get install -y jq

  jq -n --argfile existing "$CONFIG" \
    --arg log_driver "json-file" \
    --arg max_size "$MAX_SIZE" \
    --arg max_file "$MAX_FILE" \
    '($existing + {"log-driver": $log_driver, "log-opts": {"max-size": $max_size, "max-file": $max_file}})
     | .["log-driver"] = $log_driver' >"$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"

  systemctl restart docker
}

configure_docker_logs

printf "\n\n=================================================================================\n"
printf "Final cleanup"
printf "\n=================================================================================\n\n"

apt-get autoremove -y
apt-get clean

printf "\n\n=================================================================================\n"
printf "Setup script ran successfully."
printf "\n=================================================================================\n\n"
