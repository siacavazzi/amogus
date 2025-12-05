# GitHub Actions Deployment Setup

This project uses GitHub Actions to automatically deploy to DigitalOcean when you push to the `main` branch.

## Setup Instructions

### 1. Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `DROPLET_IP` | Your Droplet's IP address (e.g., `142.93.77.242`) |
| `DROPLET_SSH_KEY` | Your private SSH key (see below) |

### 2. Generate SSH Key for Deployment

On your local machine:

```bash
# Generate a new SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Copy the PUBLIC key to your Droplet
ssh-copy-id -i ~/.ssh/github_deploy_key.pub root@YOUR_DROPLET_IP

# Copy the PRIVATE key content - this goes in GitHub Secrets
cat ~/.ssh/github_deploy_key
```

Copy the entire private key output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it as the `DROPLET_SSH_KEY` secret.

### 3. Initial Server Setup

Before the first deploy, make sure your Droplet has the required software. SSH into your Droplet and run:

```bash
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
    }

    location /selfies/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:5001;
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
```

### 4. Deploy!

Now just push to the `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will:
1. Build the React app
2. Upload files to your Droplet
3. Restart the server
4. Run a health check

### Monitoring Deployments

- View deployment status: Go to your repo → **Actions** tab
- View server logs: `ssh root@YOUR_IP "journalctl -u amogus -f"`
- Manual redeploy: Go to Actions → "Deploy to DigitalOcean" → "Run workflow"
