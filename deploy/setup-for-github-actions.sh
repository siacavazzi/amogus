#!/bin/bash
# Quick initial setup for GitHub Actions deployment
# Run this ONCE on your Droplet before the first GitHub Actions deploy

set -e

echo "🚀 Setting up Droplet for GitHub Actions deployment..."

# Install dependencies
apt update && apt install -y python3 python3-pip python3-venv nginx

# Create directories
mkdir -p /opt/amogus/server/selfies
mkdir -p /opt/amogus/server/task_lists  
mkdir -p /opt/amogus/server/logs
mkdir -p /opt/amogus/client/build
mkdir -p /var/log/amogus

# Setup Python virtual environment
cd /opt/amogus
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install flask flask-socketio flask-cors eventlet gunicorn

# Setup systemd service
cat > /etc/systemd/system/amogus.service << 'EOF'
[Unit]
Description=Among Us Party Game Server
After=network.target

[Service]
Type=simple
User=root
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

# Setup nginx  
cat > /etc/nginx/sites-available/amogus << 'EOF'
server {
    listen 80;
    server_name _;
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

# Setup firewall
ufw allow ssh
ufw allow 80/tcp
ufw --force enable

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add DROPLET_IP and DROPLET_SSH_KEY secrets to GitHub"
echo "2. Push to main branch to trigger deployment"
echo ""
