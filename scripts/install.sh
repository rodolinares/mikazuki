#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mikazuki"
SERVICE_FILE="/etc/systemd/system/mikazuki.service"

echo "Installing mikazuki..."

# Create user if not exists
if ! id -u mikazuki >/dev/null 2>&1; then
  useradd --system --shell /usr/sbin/nologin mikazuki
fi

# Copy files
mkdir -p "$INSTALL_DIR"
cp -r dist/ package.json pnpm-lock.yaml "$INSTALL_DIR/"
cp .env "$INSTALL_DIR/" 2>/dev/null || echo "Warning: .env not found, copy it to $INSTALL_DIR/.env"

# Install systemd service
cp scripts/mikazuki.service "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable mikazuki
systemctl start mikazuki

echo "Installed. Service status: systemctl status mikazuki"
echo "Logs: journalctl -u mikazuki -f"
