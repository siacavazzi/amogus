#!/bin/bash
# ============================================
# Sus Party - DigitalOcean Deployment Script
# ============================================
# 
# Prerequisites:
# - Ubuntu 22.04 LTS Droplet (recommended: 1GB RAM minimum)
# - Domain name pointing to your Droplet's IP address
# - SSH access to the server
#
# Usage:
# 1. Copy this script to your server
# 2. Make it executable: chmod +x deploy.sh
# 3. Run as root: sudo ./deploy.sh your-domain.com
#
# ============================================

set -e  # Exit on any error

# Configuration
DOMAIN=${1:-"your-domain.com"}
APP_USER="amogus"
APP_DIR="/opt/amogus"
REPO_URL="https://github.com/yourusername/amogus.git"  # Update this!

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./deploy.sh)"
    exit 1
fi

log_info "Starting deployment for domain: $DOMAIN"

# ============================================
# Step 1: System Updates and Dependencies
# ============================================
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

log_info "Installing system dependencies..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    ufw

# ============================================
# Step 2: Create Application User
# ============================================
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d $APP_DIR -s /bin/bash $APP_USER
fi

# ============================================
# Step 3: Setup Directory Structure
# ============================================
log_info "Setting up directory structure..."
mkdir -p $APP_DIR
mkdir -p /var/log/amogus
mkdir -p /var/run/amogus
mkdir -p /var/www/certbot

chown -R $APP_USER:$APP_USER $APP_DIR
chown -R $APP_USER:$APP_USER /var/log/amogus
chown -R $APP_USER:$APP_USER /var/run/amogus

# ============================================
# Step 4: Clone/Update Application Code
# ============================================
log_info "Setting up application code..."
if [ -d "$APP_DIR/.git" ]; then
    log_info "Pulling latest code..."
    cd $APP_DIR
    sudo -u $APP_USER git pull
else
    log_warn "Please copy your application files to $APP_DIR"
    log_warn "Or update REPO_URL in this script and uncomment the git clone line"
    # sudo -u $APP_USER git clone $REPO_URL $APP_DIR
fi

# ============================================
# Step 5: Setup Python Virtual Environment
# ============================================
log_info "Setting up Python virtual environment..."
cd $APP_DIR
sudo -u $APP_USER python3 -m venv venv

# Install Python dependencies
log_info "Installing Python dependencies..."
sudo -u $APP_USER $APP_DIR/venv/bin/pip install --upgrade pip
sudo -u $APP_USER $APP_DIR/venv/bin/pip install \
    flask \
    flask-socketio \
    flask-cors \
    eventlet \
    gunicorn

# ============================================
# Step 6: Build React Frontend
# ============================================
log_info "Building React frontend..."
cd $APP_DIR/client

# Update ENDPOINT.js for production
cat > src/ENDPOINT.js << 'EOF'
// Production endpoint configuration
// Uses relative URLs since frontend is served from the same origin

const getEndpoint = () => {
    // In production, use same origin (relative URLs work)
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' &&
        !window.location.hostname.startsWith('192.168.')) {
        return '';  // Same origin, no prefix needed
    }
    
    // Development: use explicit URL
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:5001`;
};

export const ENDPOINT = getEndpoint();
EOF

# Install npm dependencies and build
sudo -u $APP_USER npm install
sudo -u $APP_USER npm run build

# ============================================
# Step 7: Setup Selfies Directory
# ============================================
log_info "Setting up selfies directory..."
mkdir -p $APP_DIR/server/selfies
mkdir -p $APP_DIR/server/data
chown -R $APP_USER:$APP_USER $APP_DIR/server/selfies
chown -R $APP_USER:$APP_USER $APP_DIR/server/data

# ============================================
# Step 8: Configure Nginx
# ============================================
log_info "Configuring Nginx..."

# Create nginx config with the correct domain
cat > /etc/nginx/sites-available/amogus << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    access_log /var/log/nginx/amogus_access.log;
    error_log /var/log/nginx/amogus_error.log;
    
    client_max_body_size 10M;

    root $APP_DIR/client/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /selfies/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/amogus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ============================================
# Step 9: Setup SSL with Let's Encrypt
# ============================================
log_info "Setting up SSL certificate..."

# First, we need a temporary nginx config for certbot
cat > /etc/nginx/sites-available/amogus-temp << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'Setting up...';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/amogus-temp /etc/nginx/sites-enabled/amogus
nginx -t && systemctl reload nginx

# Get certificate
certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Re-enable full config
ln -sf /etc/nginx/sites-available/amogus /etc/nginx/sites-enabled/amogus
rm /etc/nginx/sites-available/amogus-temp
nginx -t && systemctl reload nginx

# Setup auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# ============================================
# Step 10: Setup Systemd Service
# ============================================
log_info "Setting up systemd service..."

cp $APP_DIR/deploy/amogus.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable amogus
systemctl start amogus

# ============================================
# Step 11: Configure Firewall
# ============================================
log_info "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ============================================
# Step 12: Final Status Check
# ============================================
log_info "Deployment complete!"
echo ""
echo "============================================"
echo "  Deployment Summary"
echo "============================================"
echo ""
echo "  Domain: https://$DOMAIN"
echo "  App Directory: $APP_DIR"
echo "  Logs: /var/log/amogus/"
echo ""
echo "  Useful commands:"
echo "  - View logs: journalctl -u amogus -f"
echo "  - Restart app: systemctl restart amogus"
echo "  - Restart nginx: systemctl restart nginx"
echo "  - Check status: systemctl status amogus"
echo ""
echo "============================================"

# Check service status
systemctl status amogus --no-pager || true
