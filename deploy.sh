#!/bin/bash
# ============================================
# Zion Recruit - VPS Deploy Script
# Usage: bash deploy.sh [domain]
# Example: bash deploy.sh recruit.seudominio.com
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Zion Recruit - VPS Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================
# Configuration
# ============================================
DOMAIN=${1:-"your-domain.com"}
APP_DIR="/home/zion/zion-recruit"
LOGS_DIR="$APP_DIR/logs"

echo -e "${YELLOW}Domain: $DOMAIN${NC}"
echo -e "${YELLOW}App Dir: $APP_DIR${NC}"
echo ""

# ============================================
# Step 1: System Requirements
# ============================================
echo -e "${GREEN}[1/8] Checking system requirements...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js not found. Installing...${NC}"; curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; sudo apt-get install -y nodejs; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm not found.${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}Git not found. Installing...${NC}"; sudo apt-get install -y git; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ required. Found: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}  Node.js $(node -v) ✓${NC}"

# ============================================
# Step 2: Clone / Update Repository
# ============================================
echo -e "${GREEN}[2/8] Setting up repository...${NC}"

if [ -d "$APP_DIR" ]; then
    echo -e "  Updating existing repo..."
    cd "$APP_DIR"
    git pull origin main
else
    echo -e "  Cloning repository..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone https://github.com/Lobatobh/zion-recruit.git "$APP_DIR"
    cd "$APP_DIR"
fi

# ============================================
# Step 3: Install Dependencies
# ============================================
echo -e "${GREEN}[3/8] Installing dependencies...${NC}"

# System deps for sharp
sudo apt-get update -qq
sudo apt-get install -y -qq build-essential vips libvips-dev 2>/dev/null || true

# Install PM2 globally
npm install -g pm2 2>/dev/null || true

# Install Node.js deps
npm ci --omit=dev

echo -e "${GREEN}  Dependencies installed ✓${NC}"

# ============================================
# Step 4: Configure Environment
# ============================================
echo -e "${GREEN}[4/8] Configuring environment...${NC}"

if [ ! -f "$APP_DIR/.env.local" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env.local"

    # Generate secure secrets
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    INTERNAL_TOKEN=$(openssl rand -hex 32)

    # Update .env.local
    sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" "$APP_DIR/.env.local"
    sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" "$APP_DIR/.env.local"
    sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" "$APP_DIR/.env.local"
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" "$APP_DIR/.env.local"
    sed -i "s|INTERNAL_SERVICE_TOKEN=.*|INTERNAL_SERVICE_TOKEN=$INTERNAL_TOKEN|" "$APP_DIR/.env.local"

    echo -e "${YELLOW}  Created .env.local - REVIEW AND EDIT before continuing!${NC}"
    echo -e "${YELLOW}  Especially DATABASE_URL if using external PostgreSQL${NC}"
    echo ""
    echo -e "${RED}  IMPORTANT: Edit $APP_DIR/.env.local to set your database password and other secrets${NC}"
    read -p "  Press Enter after reviewing .env.local..."
else
    echo -e "  .env.local already exists, skipping..."
fi

# ============================================
# Step 5: Database Setup
# ============================================
echo -e "${GREEN}[5/8] Setting up database...${NC}"

npx prisma generate
npx prisma db push

echo -e "${GREEN}  Database ready ✓${NC}"

# ============================================
# Step 6: Build Application
# ============================================
echo -e "${GREEN}[6/8] Building Next.js application...${NC}"

NODE_OPTIONS="--max-old-space-size=2048" npm run build

echo -e "${GREEN}  Build complete ✓${NC}"

# ============================================
# Step 7: Setup PM2
# ============================================
echo -e "${GREEN}[7/8] Configuring PM2 process manager...${NC}"

# Create logs directory
mkdir -p "$LOGS_DIR"

# Update PM2 config with correct domain
sed -i "s|your-vps-ip|$(hostname -I | awk '{print $1}')|" "$APP_DIR/ecosystem.config.js"

# Stop existing processes
pm2 delete all 2>/dev/null || true

# Start with PM2
pm2 start "$APP_DIR/ecosystem.config.js" --env production

# Save PM2 config for auto-start on reboot
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo -e "${GREEN}  PM2 configured ✓${NC}"

# ============================================
# Step 8: Nginx Setup
# ============================================
echo -e "${GREEN}[8/8] Setting up Nginx...${NC}"

# Install Nginx + Certbot if not present
sudo apt-get install -y -qq nginx certbot python3-certbot-nginx 2>/dev/null || true

# Create Nginx config
sudo tee "/etc/nginx/sites-available/zion-recruit" > /dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 50M;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400s;
    }

    # Static files cache
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/zion-recruit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx || sudo systemctl start nginx

# SSL with Certbot
echo -e "${YELLOW}  Setting up SSL certificate...${NC}"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true

echo -e "${GREEN}  Nginx + SSL configured ✓${NC}"

# ============================================
# Done!
# ============================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "  URL: ${GREEN}https://$DOMAIN${NC}"
echo -e "  App: ${GREEN}http://localhost:3000${NC}"
echo -e "  Logs: ${YELLOW}$LOGS_DIR${NC}"
echo -e "  PM2: Run ${YELLOW}pm2 status${NC} to check processes"
echo -e "  DB:  Run ${YELLOW}npx prisma studio${NC} for DB admin"
echo ""
echo -e "${YELLOW}Default login: admin@zion.demo / password123${NC}"
echo -e "${RED}CHANGE THE PASSWORD AFTER FIRST LOGIN!${NC}"
echo ""
