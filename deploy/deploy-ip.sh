#!/bin/bash
# ============================================
# Among Us Party Game - IP-Only Deployment (No Domain)
# ============================================

set -e

APP_USER="amogus"
APP_DIR="/opt/amogus"
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./deploy-ip.sh)"
    exit 1
fi

log_info "Deploying to IP: $SERVER_IP"

# Step 1: System Updates
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

log_info "Installing dependencies..."
apt-get install -y python3 python3-pip python3-venv nginx git curl ufw

# Install Node.js 18.x (Ubuntu's default is too old)
log_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Step 2: Create user
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d $APP_DIR -s /bin/bash $APP_USER
fi

# Step 3: Setup directories
log_info "Setting up directories..."
mkdir -p /var/log/amogus
mkdir -p /var/run/amogus
chown -R $APP_USER:$APP_USER $APP_DIR
chown -R $APP_USER:$APP_USER /var/log/amogus
chown -R $APP_USER:$APP_USER /var/run/amogus

# Step 4: Python virtual environment
log_info "Setting up Python environment..."
cd $APP_DIR
python3 -m venv venv
$APP_DIR/venv/bin/pip install --upgrade pip
$APP_DIR/venv/bin/pip install flask flask-socketio flask-cors eventlet gunicorn

# Step 5: Build React frontend
log_info "Building React frontend..."
cd $APP_DIR/client

# Update ENDPOINT.js for IP-based access
cat > src/ENDPOINT.js << 'EOF'
// IP-based endpoint configuration
const getEndpoint = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Same origin - nginx proxies to Flask
    return `${protocol}//${hostname}`;
};
export const ENDPOINT = getEndpoint();
EOF

npm install
npm run build

# Step 6: Setup directories
log_info "Setting up data directories..."
mkdir -p $APP_DIR/server/selfies
mkdir -p $APP_DIR/server/data
chown -R $APP_USER:$APP_USER $APP_DIR

# Step 7: Configure Nginx (HTTP only)
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/amogus << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    access_log /var/log/nginx/amogus_access.log;
    error_log /var/log/nginx/amogus_error.log;
    
    client_max_body_size 10M;

    root /opt/amogus/client/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /selfies/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/amogus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Step 8: Setup systemd service
log_info "Setting up systemd service..."
cat > /etc/systemd/system/amogus.service << 'EOF'
[Unit]
Description=Among Us Party Game Server
After=network.target

[Service]
Type=simple
User=amogus
Group=amogus
WorkingDirectory=/opt/amogus/server
Environment="PATH=/opt/amogus/venv/bin"
ExecStart=/opt/amogus/venv/bin/gunicorn -k eventlet -w 1 -b 127.0.0.1:5001 --timeout 120 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable amogus
systemctl start amogus

# Step 9: Firewall
log_info "Configuring firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw --force enable

# Done!
echo ""
echo "============================================"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "============================================"
echo ""
echo "  Your game is live at: http://$SERVER_IP"
echo ""
echo "  Useful commands:"
echo "  - View logs: journalctl -u amogus -f"
echo "  - Restart app: systemctl restart amogus"
echo "  - Check status: systemctl status amogus"
echo ""
log_warn "Note: Camera/selfie feature won't work on mobile"
log_warn "without HTTPS. Add a domain later for full features."
echo "============================================"

sleep 2
systemctl status amogus --no-pager || true
