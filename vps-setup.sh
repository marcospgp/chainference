#!/bin/bash
set -euo pipefail

# Script used to initialize VPS.
# Designed to be idempotent, so it can be run multiple times when iterating.
#
# Usage:
#   1. Create VPS.
#   2. SSH in as root user.
#   3. Run "nano setup.sh", paste the contents of this file, update variables below, and save.
#   4. Run "bash setup.sh".

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

SUDO_USERS=(
  "bernardo:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBesw1jrqTa2CepHsk35RX1wZeT5CCM1hBgbS8KDLS9D bfar97@gmail.com"
  "marcos:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGJ2vrIhoGkV+8kath2C3utUJ8zymmascDMWpLQs1Yrr email@marcospereira.me"
)

DOCKER_ONLY_USERS=(
  "github:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDR7JRuR3FgsI2RRqtb5mS00jO/emFGS0cyM3M1n6Up2 github"
)

print_section() {
  local title="$1"
  printf "\n\n=================================================================================\n"
  printf "%s" "$title"
  printf "\n=================================================================================\n\n"
}

set_config_line() {
  local file="$1"
  local key="$2"
  local value="$3"
  # Separator, defaults to space.
  local sep="${4:- }"

  # Ensure the file exists
  touch "$file"

  # If the key exists, update the line.
  if grep -qE "^[[:space:]]*#?[[:space:]]*${key}\b" "$file"; then
    sed -i -E "s|^[[:space:]]*#?[[:space:]]*${key}\b.*|${key}${sep}${value}|g" "$file"
  # Otherwise, add it.
  else
    echo "${key}${sep}${value}" >>"$file"
  fi
}

miscellaneous() {
  print_section "miscellaneous"

  timedatectl set-timezone UTC

  # Update packages
  apt-get update -y
  apt-get dist-upgrade -y

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
}

security() {
  print_section "security"

  # Lock root password.
  passwd --lock root

  # SSH hardening
  set_config_line "/etc/ssh/sshd_config" "PermitRootLogin" "no"
  set_config_line "/etc/ssh/sshd_config" "PasswordAuthentication" "no"
  set_config_line "/etc/ssh/sshd_config" "PubkeyAuthentication" "yes"
  set_config_line "/etc/ssh/sshd_config" "UsePAM" "no"
  systemctl restart ssh

  # Sysctl hardening
  set_config_line "/etc/sysctl.conf" "net.ipv4.conf.all.accept_redirects" "0" "="
  set_config_line "/etc/sysctl.conf" "net.ipv4.conf.all.send_redirects" "0" "="
  set_config_line "/etc/sysctl.conf" "net.ipv4.conf.all.rp_filter" "1" "="
  set_config_line "/etc/sysctl.conf" "net.ipv4.tcp_syncookies" "1" "="
  set_config_line "/etc/sysctl.conf" "net.ipv4.conf.all.log_martians" "1" "="
  set_config_line "/etc/sysctl.conf" "net.ipv4.conf.all.accept_source_route" "0" "="
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
mode = aggressive
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
  systemctl enable --now fail2ban

  # Enable firewall.
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw --force enable

  # passwd and shadow file ownership.
  sudo chown root:root /etc/passwd
  sudo chmod 644 /etc/passwd
  chown root:shadow /etc/shadow
  chmod 600 /etc/shadow
}

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

create_users() {
  print_section "create users"

  # Create users.
  for user in "${SUDO_USERS[@]}" "${DOCKER_ONLY_USERS[@]}"; do
    IFS=":" read -r username user_key <<<"$user"
    create_user_if_not_exists "$username" "$user_key"
  done

  # Give sudo privileges to sudo users.
  for user in "${SUDO_USERS[@]}"; do
    IFS=":" read -r username user_key <<<"$user"

    # Add to sudo group.
    usermod -aG sudo "$username"

    # Grant passwordless sudo.
    echo "$username ALL=(ALL) NOPASSWD: ALL" >"/etc/sudoers.d/$username"
    chmod 0440 "/etc/sudoers.d/$username"
  done

  printf "All users created successfully.\n"
}

set_up_github_user() {
  print_section "set up github user"

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
}

unattended_upgrades() {
  print_section "set up unattended upgrades"

  apt-get install -y unattended-upgrades

  set_config_line "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::Update-Package-Lists" "\"1\";"
  set_config_line "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::Unattended-Upgrade" "\"1\";"
  set_config_line "/etc/apt/apt.conf.d/20auto-upgrades" "APT::Periodic::RandomSleep" "\"3600\";"
  set_config_line "/etc/apt/apt.conf.d/50unattended-upgrades" "Unattended-Upgrade::Automatic-Reboot" "\"true\";"
  # Reboot at 12 noon UTC, when america is sleeping.
  set_config_line "/etc/apt/apt.conf.d/50unattended-upgrades" "Unattended-Upgrade::Automatic-Reboot-Time" "\"12:00\";"

  systemctl enable --now unattended-upgrades
  unattended-upgrades --dry-run
}

set_up_docker() {
  print_section "set up docker"

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

  # Add users to the docker group.
  # This is equivalent to root access.
  for user in "${SUDO_USERS[@]}" "${DOCKER_ONLY_USERS[@]}"; do
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

  # Ensure Docker gets updated by unattended upgrades.
  # shellcheck disable=SC2016
  if grep -qxF '"Docker:${distro_codename}";' /etc/apt/apt.conf.d/50unattended-upgrades; then
    echo "Docker is already included in unattended-upgrades."
  else
    echo "Adding Docker to unattended-upgrades..."
    sed -i '/Unattended-Upgrade::Allowed-Origins {/a\        "Docker:stable";' /etc/apt/apt.conf.d/50unattended-upgrades
  fi
}

cleanup() {
  print_section "final cleanup"

  apt-get autoremove -y
  apt-get clean
}

prompt_for_restart_if_needed() {
  if [ -f /var/run/reboot-required ]; then
    printf "A system restart is required.\n"
    read -p "Would you like to restart now? (y/N): " -r REPLY
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      printf "\nRestarting now...\n"
      reboot
    else
      printf "\nRestart skipped. Remember to restart later by running \"reboot\".\n"
    fi
  else
    printf "\nNo restart required.\n"
  fi
}

miscellaneous
security
create_users
set_up_github_user
unattended_upgrades
set_up_docker
cleanup
prompt_for_restart_if_needed

print_section "setup script ran successfully."
