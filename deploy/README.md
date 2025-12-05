# Among Us Party Game - DigitalOcean Deployment Guide

This guide walks you through deploying the Among Us party game to a DigitalOcean Droplet.

## Prerequisites

1. A DigitalOcean account
2. A domain name (optional but recommended for HTTPS/camera access)
3. SSH key added to your DigitalOcean account

## Quick Start

### 1. Create a Droplet

1. Log in to DigitalOcean
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic, $6/mo (1GB RAM, 1 CPU) - sufficient for small games
   - **Region**: Choose closest to your players
   - **Authentication**: SSH keys (recommended)
3. Note the Droplet's IP address

### 2. Point Your Domain

Add an A record in your DNS settings:
```
Type: A
Name: @ (or your subdomain like "game")
Value: YOUR_DROPLET_IP
TTL: 300
```

Wait for DNS propagation (can take up to 48 hours, usually much faster).

### 3. Deploy

SSH into your Droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Upload and run the deployment script:
```bash
# On your local machine, upload the files
scp -r ./amogus root@YOUR_DROPLET_IP:/opt/

# On the server
cd /opt/amogus
chmod +x deploy/deploy.sh
./deploy/deploy.sh your-domain.com
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. System Setup

```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git ufw

# Create app user
useradd -r -m -d /opt/amogus -s /bin/bash amogus
```

### 2. Application Setup

```bash
# Clone/copy your code
cd /opt/amogus

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r server/requirements.txt

# Build React frontend
cd client
npm install
npm run build
```

### 3. SSL Certificate

```bash
# Get Let's Encrypt certificate
certbot certonly --webroot -w /var/www/certbot -d your-domain.com --non-interactive --agree-tos --email your@email.com
```

### 4. Configure Nginx

Copy `deploy/nginx-amogus.conf` to `/etc/nginx/sites-available/amogus` and update the domain name:

```bash
cp deploy/nginx-amogus.conf /etc/nginx/sites-available/amogus
# Edit the file to replace 'your-domain.com' with your actual domain
nano /etc/nginx/sites-available/amogus

# Enable the site
ln -s /etc/nginx/sites-available/amogus /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 5. Configure Systemd

```bash
cp deploy/amogus.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable amogus
systemctl start amogus
```

### 6. Configure Firewall

```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

## Useful Commands

```bash
# View application logs
journalctl -u amogus -f

# View nginx logs
tail -f /var/log/nginx/amogus_error.log

# Restart the application
systemctl restart amogus

# Check application status
systemctl status amogus

# Reload nginx after config changes
nginx -t && systemctl reload nginx
```

## Updating the Application

```bash
cd /opt/amogus

# Pull latest code (if using git)
git pull

# Rebuild frontend
cd client
npm install
npm run build

# Restart server
systemctl restart amogus
```

## Troubleshooting

### Camera not working on mobile
- Make sure you're using HTTPS (required for camera access)
- Check that SSL certificate is valid
- On iOS, camera permissions are per-site

### WebSocket connection fails
- Check nginx is properly proxying /socket.io/
- Check firewall allows HTTPS (port 443)
- Check server logs: `journalctl -u amogus -f`

### 502 Bad Gateway
- Check if gunicorn is running: `systemctl status amogus`
- Check if port 5001 is being used: `netstat -tlnp | grep 5001`
- Check application logs for errors

### SSL Certificate Issues
- Renew certificate: `certbot renew`
- Check certificate status: `certbot certificates`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Internet                        │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Nginx (Port 443, HTTPS)                │
│  - SSL termination                                  │
│  - Static file serving (React build)               │
│  - Reverse proxy to Flask                          │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    Static Files     /api/*         /socket.io/
    (React Build)    /selfies/      (WebSocket)
                          │               │
                          └───────┬───────┘
                                  ▼
┌─────────────────────────────────────────────────────┐
│         Gunicorn + Eventlet (Port 5001)             │
│  - Flask application                                │
│  - Flask-SocketIO (real-time communication)         │
│  - Game state management                            │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              File System Storage                    │
│  - /opt/amogus/server/selfies/ (player photos)      │
│  - /opt/amogus/server/data/ (task lists)            │
└─────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Keep system updated**: Run `apt update && apt upgrade` regularly
2. **SSL/TLS**: Always use HTTPS in production
3. **Firewall**: Only expose necessary ports (22, 80, 443)
4. **Systemd hardening**: The service file includes security restrictions
5. **Regular backups**: Back up the selfies and data directories if needed

## Scaling

For larger deployments:

1. **Increase Droplet size**: More RAM/CPU for more concurrent games
2. **Load balancing**: Use DigitalOcean Load Balancers with sticky sessions (required for Socket.IO)
3. **Database**: Replace file-based storage with Redis/PostgreSQL
4. **CDN**: Use DigitalOcean Spaces CDN for static assets

## Cost Estimate

- **Basic Droplet** ($6/mo): Good for testing and small parties
- **1GB RAM Droplet** ($12/mo): Recommended for regular use
- **Domain**: ~$12/year for .com
- **Total**: ~$6-12/month
