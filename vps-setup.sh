#!/bin/bash
set -euxo pipefail

# Script used to initialize VPS.
# Usage:
#   1. Create VPS
#   2. SSH in as root user
#   3. Copy script into file in VPS, updating variables below
#   4. Run the script file with the "bash" command.

USERS=(
  "bernardo:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBesw1jrqTa2CepHsk35RX1wZeT5CCM1hBgbS8KDLS9D bfar97@gmail.com"
  "marcos:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGJ2vrIhoGkV+8kath2C3utUJ8zymmascDMWpLQs1Yrr email@marcospereira.me"
  "github:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDR7JRuR3FgsI2RRqtb5mS00jO/emFGS0cyM3M1n6Up2 github"
)

SSH_KEY=$(
  cat <<'EOF'
Paste VPS private SSH key here!
The corresponding public key should be given read access to relevant repos.
EOF
)

printf "\n\n ========> SSH hardening \n\n"

sed -i 's/^#?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

printf "\n\n ========> Creating users and setting up SSH keys \n\n"

create_user() {
  local USERNAME="$1"
  local SSH_KEY="$2"

  # Create user if it doesn't exist
  if ! id "$USERNAME" &>/dev/null; then
    useradd -m -s /bin/bash "$USERNAME"
  fi

  # Grant sudo privileges without password
  echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/$USERNAME"
  chmod 440 "/etc/sudoers.d/$USERNAME"

  # Set up SSH directory
  local SSH_DIR="/home/$USERNAME/.ssh"
  mkdir -p "$SSH_DIR"
  chmod 700 "$SSH_DIR"

  # Add the SSH key
  echo "$SSH_KEY" >"$SSH_DIR/authorized_keys"
  chmod 600 "$SSH_DIR/authorized_keys"

  # Ensure proper ownership
  chown -R "$USERNAME:$USERNAME" "$SSH_DIR"

  printf "✅ Created user: %s with SSH access.\n\n" "$USERNAME"
}

for user in "${USERS[@]}"; do
  IFS=":" read -r username ssh_key <<<"$user"
  create_user "$username" "$ssh_key"
done

printf "\n\n ✅ All users created successfully! \n\n"

printf "\n\n ========> Setup github user \n\n"

# Store private SSH key.
cat <<EOF >/home/github/.ssh/id_ed25519
$SSH_KEY
EOF
chmod 600 /home/github/.ssh/id_ed25519

# Add github to allowed hosts.
touch /home/github/.ssh/known_hosts
ssh-keyscan github.com >>/home/github/.ssh/known_hosts

# Ensure correct ownership for everything in .ssh
chown -R github:github /home/github/.ssh

printf "\n\n ========> Update packages \n\n"
apt update -y
# Same as apt upgrade but will add & remove packages as appropriate.
apt dist-upgrade -y

printf "\n\n ========> unattended-upgrades \n\n"

apt install -y unattended-upgrades

cat <<EOF >/etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# Reboot at 12 noon, when america is sleeping.
cat <<EOF >/etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Allowed-Origins {
  "\${distro_id}:\${distro_codename}-security";
  "\${distro_id}:\${distro_codename}-updates";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "12:00";
EOF

systemctl enable --now unattended-upgrades

printf "\n\n ========> Fail2ban \n\n"
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

printf "\n\n ========> Firewall \n\n"
ufw allow OpenSSH
ufw --force enable

printf "\n\n ========> Set up Docker \n\n"

# Steps copied from https://docs.docker.com/engine/install/ubuntu/
# (removed sudo )

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

printf "\n\n ========> Disable root user \n\n"
passwd -l root

printf "\n\n ========> setup script ran successfully \n\n"
