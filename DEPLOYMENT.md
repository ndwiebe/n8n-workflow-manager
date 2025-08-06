# n8n Workflow Manager - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the n8n Workflow Manager for Small and Medium Business (SMB) clients. The platform is designed to deliver immediate business value through automated workflow solutions with a focus on ROI, business metrics, and operational efficiency.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Backend API Deployment](#backend-api-deployment)
6. [Frontend Application Deployment](#frontend-application-deployment)
7. [n8n Integration Setup](#n8n-integration-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Domain and DNS Setup](#domain-and-dns-setup)
10. [Security Hardening](#security-hardening)
11. [Monitoring and Logging](#monitoring-and-logging)
12. [Backup and Recovery](#backup-and-recovery)
13. [Performance Optimization](#performance-optimization)
14. [Post-Deployment Verification](#post-deployment-verification)
15. [Client Onboarding](#client-onboarding)
16. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements (Small Business - Up to 25 employees)
- **CPU**: 2 vCPUs
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Bandwidth**: 100 Mbps
- **OS**: Ubuntu 20.04 LTS or later

### Recommended Requirements (Medium Business - 25-100 employees)
- **CPU**: 4 vCPUs
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Bandwidth**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

### Enterprise Requirements (100+ employees)
- **CPU**: 8 vCPUs
- **RAM**: 16 GB
- **Storage**: 200 GB SSD (with backup storage)
- **Bandwidth**: 1 Gbps+
- **OS**: Ubuntu 22.04 LTS
- **Load Balancer**: Recommended for high availability

### Supported Cloud Providers
- AWS (t3.medium or larger)
- Google Cloud Platform (n2-standard-2 or larger)
- Microsoft Azure (Standard_D2s_v3 or larger)
- DigitalOcean (4 GB Droplet or larger)
- Hetzner Cloud (CX21 or larger)

## Pre-Deployment Checklist

### Business Requirements Gathering
- [ ] Client business size and employee count
- [ ] Monthly transaction volume
- [ ] Required workflow integrations
- [ ] Existing systems to connect (QuickBooks, Salesforce, etc.)
- [ ] Compliance requirements (GDPR, HIPAA, SOX)
- [ ] Business hours and timezone
- [ ] Expected growth over 12 months

### Technical Preparation
- [ ] Domain name registered and accessible
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] Cloud server provisioned
- [ ] Database backup strategy defined
- [ ] Monitoring tools selected
- [ ] Email service configured (SendGrid, AWS SES, etc.)

### Access and Credentials
- [ ] Server SSH access configured
- [ ] Database admin credentials secure
- [ ] Third-party API keys collected
- [ ] Email service credentials ready
- [ ] SSL certificate files available

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash n8nworkflow
sudo usermod -aG docker n8nworkflow

# Switch to application user
sudo su - n8nworkflow

# Create application directory
mkdir -p /home/n8nworkflow/app
cd /home/n8nworkflow/app
```

## Database Configuration

### PostgreSQL Setup

```bash
# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE n8n_workflow_manager;
CREATE USER n8n_workflow_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE n8n_workflow_manager TO n8n_workflow_user;
ALTER USER n8n_workflow_user CREATEDB;
\\q
EOF
```

### Redis Setup (for caching and sessions)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Uncomment and set: requirepass YourRedisPassword123!

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Database Security Configuration

```bash
# Configure PostgreSQL security
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Ensure: local all all md5
# Ensure: host all all 127.0.0.1/32 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Backend API Deployment

### 1. Clone and Setup Repository

```bash
# Switch to application user
sudo su - n8nworkflow
cd /home/n8nworkflow/app

# Clone repository
git clone https://github.com/ndwiebe/n8n-workflow-manager.git .
cd backend

# Install dependencies
npm install --production
```

### 2. Environment Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

#### Production Environment Variables

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database Configuration
DATABASE_URL=postgresql://n8n_workflow_user:SecurePassword123!@localhost:5432/n8n_workflow_manager
DB_HOST=localhost
DB_PORT=5432
DB_NAME=n8n_workflow_manager
DB_USER=n8n_workflow_user
DB_PASSWORD=SecurePassword123!

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=YourRedisPassword123!

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret-key-here-minimum-32-characters
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Email Service (SendGrid example)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=n8n Workflow Manager

# n8n Integration
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-n8n-api-key

# Business Analytics
ANALYTICS_ENABLED=true
METRICS_RETENTION_DAYS=365

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/home/n8nworkflow/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Monitoring
LOG_LEVEL=info
LOG_FILE_PATH=/home/n8nworkflow/logs/app.log

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=/home/n8nworkflow/backups
```

### 3. Database Migration and Seeding

```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Create admin user
npm run create-admin -- --email admin@yourdomain.com --password AdminPassword123!
```

### 4. Build and Start Backend

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. PM2 Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'n8n-workflow-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/n8nworkflow/logs/err.log',
    out_file: '/home/n8nworkflow/logs/out.log',
    log_file: '/home/n8nworkflow/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: ['--max-old-space-size=1024']
  }]
};
```

## Frontend Application Deployment

### 1. Build Frontend

```bash
# Navigate to frontend directory
cd /home/n8nworkflow/app

# Install dependencies
npm install

# Create production environment file
cp .env.example .env.production
```

### 2. Frontend Environment Configuration

Edit `.env.production`:

```bash
# API Configuration
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_WS_URL=wss://yourdomain.com/ws

# Application Configuration
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_COMPANY_NAME=Your Company Name

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
REACT_APP_ANALYTICS_ENABLED=true

# Features
REACT_APP_ENABLE_PWA=true
REACT_APP_ENABLE_OFFLINE_MODE=true

# Security
REACT_APP_CSP_ENABLED=true
REACT_APP_HTTPS_ONLY=true

# Business Branding
REACT_APP_PRIMARY_COLOR=#1976d2
REACT_APP_SECONDARY_COLOR=#dc004e
REACT_APP_LOGO_URL=/assets/logo.png
```

### 3. Build and Deploy Frontend

```bash
# Build production bundle
npm run build

# Copy build files to web server directory
sudo mkdir -p /var/www/n8n-workflow-manager
sudo cp -r build/* /var/www/n8n-workflow-manager/
sudo chown -R www-data:www-data /var/www/n8n-workflow-manager
sudo chmod -R 755 /var/www/n8n-workflow-manager
```

## n8n Integration Setup

### 1. Install n8n

```bash
# Install n8n globally
sudo npm install -g n8n

# Create n8n data directory
sudo mkdir -p /home/n8nworkflow/.n8n
sudo chown -R n8nworkflow:n8nworkflow /home/n8nworkflow/.n8n
```

### 2. n8n Environment Configuration

```bash
# Create n8n environment file
sudo nano /home/n8nworkflow/.n8n/.env
```

```bash
# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=n8nAdminPassword123!

# Database
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n_workflows
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=n8nDbPassword123!

# Security
N8N_JWT_AUTH_HEADER_NAME=authorization
N8N_JWT_AUTH_HEADER=Bearer

# Webhook Configuration
WEBHOOK_URL=https://yourdomain.com/webhook/

# Execution
EXECUTIONS_PROCESS=own
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true

# General
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost
```

### 3. Create n8n Database

```bash
sudo -u postgres psql << EOF
CREATE DATABASE n8n_workflows;
CREATE USER n8n_user WITH ENCRYPTED PASSWORD 'n8nDbPassword123!';
GRANT ALL PRIVILEGES ON DATABASE n8n_workflows TO n8n_user;
\\q
EOF
```

### 4. Start n8n with PM2

```bash
# Create n8n PM2 configuration
cat > /home/n8nworkflow/n8n-ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'n8n',
    script: 'n8n',
    cwd: '/home/n8nworkflow',
    env: {
      NODE_ENV: 'production',
      N8N_USER_FOLDER: '/home/n8nworkflow/.n8n'
    },
    error_file: '/home/n8nworkflow/logs/n8n-err.log',
    out_file: '/home/n8nworkflow/logs/n8n-out.log',
    log_file: '/home/n8nworkflow/logs/n8n-combined.log',
    time: true
  }]
};
EOF

# Start n8n
pm2 start /home/n8nworkflow/n8n-ecosystem.config.js
```

## SSL/TLS Configuration

### 1. Obtain SSL Certificate

```bash
# Using Let's Encrypt (recommended for production)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Or upload your own certificates
sudo mkdir -p /etc/ssl/private/yourdomain.com
sudo mkdir -p /etc/ssl/certs/yourdomain.com

# Copy your certificates
sudo cp yourdomain.com.key /etc/ssl/private/yourdomain.com/
sudo cp yourdomain.com.crt /etc/ssl/certs/yourdomain.com/
sudo cp yourdomain.com.ca-bundle /etc/ssl/certs/yourdomain.com/

# Set proper permissions
sudo chmod 600 /etc/ssl/private/yourdomain.com/yourdomain.com.key
sudo chmod 644 /etc/ssl/certs/yourdomain.com/*
```

### 2. Nginx Configuration

Create `/etc/nginx/sites-available/n8n-workflow-manager`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:";
    
    # Root directory for frontend
    root /var/www/n8n-workflow-manager;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket proxy for real-time notifications
    location /ws/ {
        proxy_pass http://localhost:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    
    # n8n webhook proxy
    location /webhook/ {
        proxy_pass http://localhost:5678/webhook/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # n8n editor (admin access only)
    location /n8n/ {
        # Restrict access by IP (optional)
        # allow 192.168.1.0/24;
        # deny all;
        
        proxy_pass http://localhost:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Security - deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /(package\.json|composer\.json|\.env)$ {
        deny all;
    }
}
```

### 3. Enable Site and Restart Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/n8n-workflow-manager /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Domain and DNS Setup

### DNS Records Configuration

Add the following DNS records to your domain:

```
Type    Name    Value               TTL
A       @       YOUR_SERVER_IP      300
A       www     YOUR_SERVER_IP      300
CNAME   api     yourdomain.com      300
```

### Verification

```bash
# Test DNS resolution
nslookup yourdomain.com
nslookup www.yourdomain.com

# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Install and configure UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

### 2. SSH Security

```bash
# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

Recommended SSH settings:

```bash
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
# Restart SSH service
sudo systemctl restart ssh
```

### 3. System Security

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Basic fail2ban configuration:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Start and enable fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 4. Database Security

```bash
# Secure PostgreSQL installation
sudo -u postgres psql << EOF
ALTER USER postgres WITH PASSWORD 'SuperSecurePostgresPassword123!';
\\q
EOF

# Limit database connections
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: max_connections = 100
# Set: shared_buffers = 256MB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Monitoring and Logging

### 1. Application Monitoring

```bash
# Install monitoring tools
sudo npm install -g @pm2/io
sudo npm install -g pm2-logrotate

# Configure PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. System Monitoring with Netdata

```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait

# Configure Netdata
sudo nano /etc/netdata/netdata.conf
```

Basic Netdata configuration:

```ini
[global]
    bind socket to IP = 127.0.0.1
    access log = none
    error log = syslog
    debug log = none
```

### 3. Log Management

```bash
# Create log directories
sudo mkdir -p /home/n8nworkflow/logs
sudo chown -R n8nworkflow:n8nworkflow /home/n8nworkflow/logs

# Configure logrotate
sudo nano /etc/logrotate.d/n8n-workflow-manager
```

Logrotate configuration:

```
/home/n8nworkflow/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 n8nworkflow n8nworkflow
    postrotate
        pm2 reload n8n-workflow-backend
    endscript
}
```

### 4. Health Check Endpoint

Create a health check script `health-check.sh`:

```bash
#!/bin/bash
# Health check script for n8n Workflow Manager

# Check API health
API_HEALTH=$(curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$API_HEALTH" != "200" ]; then
    echo "API health check failed: $API_HEALTH"
    exit 1
fi

# Check database connection
DB_CHECK=$(PGPASSWORD=SecurePassword123! psql -h localhost -U n8n_workflow_user -d n8n_workflow_manager -c "SELECT 1;" -t -A)
if [ "$DB_CHECK" != "1" ]; then
    echo "Database health check failed"
    exit 1
fi

# Check Redis connection
REDIS_CHECK=$(redis-cli -a YourRedisPassword123! ping)
if [ "$REDIS_CHECK" != "PONG" ]; then
    echo "Redis health check failed"
    exit 1
fi

# Check n8n
N8N_HEALTH=$(curl -f -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz)
if [ "$N8N_HEALTH" != "200" ]; then
    echo "n8n health check failed: $N8N_HEALTH"
    exit 1
fi

echo "All services healthy"
exit 0
```

```bash
# Make executable
chmod +x /home/n8nworkflow/health-check.sh

# Add to crontab for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/n8nworkflow/health-check.sh >> /home/n8nworkflow/logs/health-check.log 2>&1") | crontab -
```

## Backup and Recovery

### 1. Database Backup Script

Create `backup-db.sh`:

```bash
#!/bin/bash
# Database backup script

BACKUP_DIR="/home/n8nworkflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="n8n_workflow_manager"
DB_USER="n8n_workflow_user"
DB_PASSWORD="SecurePassword123!"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup main database
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/main_db_$DATE.sql

# Backup n8n database
PGPASSWORD=n8nDbPassword123! pg_dump -h localhost -U n8n_user -d n8n_workflows > $BACKUP_DIR/n8n_db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C /home/n8nworkflow/app --exclude=node_modules --exclude=.git .

# Backup configurations
tar -czf $BACKUP_DIR/configs_$DATE.tar.gz /etc/nginx/sites-available/n8n-workflow-manager /home/n8nworkflow/.n8n

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Compress recent backups
gzip $BACKUP_DIR/*_$DATE.sql

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /home/n8nworkflow/backup-db.sh

# Schedule daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /home/n8nworkflow/backup-db.sh >> /home/n8nworkflow/logs/backup.log 2>&1") | crontab -
```

### 2. Recovery Procedures

Create `restore-db.sh`:

```bash
#!/bin/bash
# Database restore script

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_date>"
    echo "Example: $0 20240101_020000"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/home/n8nworkflow/backups"
DB_NAME="n8n_workflow_manager"
DB_USER="n8n_workflow_user"
DB_PASSWORD="SecurePassword123!"

# Stop applications
pm2 stop all

# Restore main database
echo "Restoring main database..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME < $BACKUP_DIR/main_db_$BACKUP_DATE.sql.gz

# Restore n8n database
echo "Restoring n8n database..."
PGPASSWORD=n8nDbPassword123! psql -h localhost -U n8n_user -d n8n_workflows < $BACKUP_DIR/n8n_db_$BACKUP_DATE.sql.gz

# Restore application files if needed
if [ -f "$BACKUP_DIR/app_files_$BACKUP_DATE.tar.gz" ]; then
    echo "Restoring application files..."
    tar -xzf $BACKUP_DIR/app_files_$BACKUP_DATE.tar.gz -C /home/n8nworkflow/app
fi

# Start applications
pm2 start all

echo "Restore completed for backup: $BACKUP_DATE"
```

## Performance Optimization

### 1. Database Optimization

```bash
# PostgreSQL performance tuning
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Recommended PostgreSQL settings for SMB deployment:

```
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = pl
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. Redis Optimization

```bash
# Redis performance settings
sudo nano /etc/redis/redis.conf
```

```
# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 300
```

### 3. Application Performance

Update PM2 ecosystem for better performance:

```javascript
module.exports = {
  apps: [{
    name: 'n8n-workflow-backend',
    script: 'dist/server.js',
    instances: 2, // Adjust based on CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      UV_THREADPOOL_SIZE: 4
    }
  }]
};
```

### 4. Nginx Caching

Add caching configuration to Nginx:

```nginx
# Add to http block in /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m use_temp_path=off;

# Add to server block
location /api/metrics/ {
    proxy_cache api_cache;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Proxy-Cache $upstream_cache_status;
    
    proxy_pass http://localhost:3000/api/metrics/;
    # ... other proxy settings
}
```

## Post-Deployment Verification

### 1. Automated Testing

Create `deployment-test.sh`:

```bash
#!/bin/bash
# Post-deployment verification script

BASE_URL="https://yourdomain.com"
API_URL="$BASE_URL/api"

echo "Starting post-deployment verification..."

# Test 1: Frontend accessibility
echo "Testing frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Frontend test failed: HTTP $HTTP_CODE"
    exit 1
fi
echo "✅ Frontend accessible"

# Test 2: API health check
echo "Testing API health..."
API_HEALTH=$(curl -s "$API_URL/health" | jq -r '.status')
if [ "$API_HEALTH" != "ok" ]; then
    echo "❌ API health check failed"
    exit 1
fi
echo "✅ API healthy"

# Test 3: Database connectivity
echo "Testing database connectivity..."
DB_STATUS=$(curl -s "$API_URL/health/db" | jq -r '.status')
if [ "$DB_STATUS" != "connected" ]; then
    echo "❌ Database connection failed"
    exit 1
fi
echo "✅ Database connected"

# Test 4: Authentication endpoint
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@yourdomain.com","password":"AdminPassword123!"}')
TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')
if [ "$TOKEN" = "null" ]; then
    echo "❌ Authentication test failed"
    exit 1
fi
echo "✅ Authentication working"

# Test 5: Protected endpoint
echo "Testing protected endpoints..."
PROFILE_RESPONSE=$(curl -s "$API_URL/user/profile" \
    -H "Authorization: Bearer $TOKEN")
USER_ID=$(echo $PROFILE_RESPONSE | jq -r '.id')
if [ "$USER_ID" = "null" ]; then
    echo "❌ Protected endpoint test failed"
    exit 1
fi
echo "✅ Protected endpoints working"

# Test 6: n8n accessibility
echo "Testing n8n integration..."
N8N_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/n8n/")
if [ "$N8N_STATUS" != "200" ]; then
    echo "❌ n8n integration test failed: HTTP $N8N_STATUS"
    exit 1
fi
echo "✅ n8n integration working"

# Test 7: SSL certificate
echo "Testing SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "⚠️  SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
else
    echo "✅ SSL certificate valid ($DAYS_UNTIL_EXPIRY days remaining)"
fi

echo "✅ All deployment verification tests passed!"
```

### 2. Performance Benchmarking

```bash
# Install Apache Bench for performance testing
sudo apt install -y apache2-utils

# Create performance test script
cat > performance-test.sh << 'EOF'
#!/bin/bash

BASE_URL="https://yourdomain.com"
CONCURRENT_USERS=10
TOTAL_REQUESTS=100

echo "Running performance tests..."

# Test frontend loading
echo "Testing frontend performance..."
ab -n $TOTAL_REQUESTS -c $CONCURRENT_USERS $BASE_URL/ > /tmp/frontend-perf.txt
FRONTEND_RPS=$(grep "Requests per second" /tmp/frontend-perf.txt | awk '{print $4}')
echo "Frontend RPS: $FRONTEND_RPS"

# Test API performance
echo "Testing API performance..."
ab -n $TOTAL_REQUESTS -c $CONCURRENT_USERS -H "Content-Type: application/json" $BASE_URL/api/health > /tmp/api-perf.txt
API_RPS=$(grep "Requests per second" /tmp/api-perf.txt | awk '{print $4}')
echo "API RPS: $API_RPS"

echo "Performance test completed"
EOF

chmod +x performance-test.sh
```

## Client Onboarding

### 1. Client Setup Checklist

Create `client-onboarding.md`:

```markdown
# Client Onboarding Checklist

## Pre-Onboarding (Technical Setup)
- [ ] Domain configured and SSL certificate installed
- [ ] Initial admin account created
- [ ] Basic workflows configured and tested
- [ ] Monitoring and backups operational
- [ ] Performance benchmarks documented

## Client Information Gathering
- [ ] Company information and branding assets
- [ ] Employee count and organizational structure
- [ ] Current business processes and pain points
- [ ] Existing integrations and systems
- [ ] Compliance and security requirements
- [ ] Success metrics and ROI expectations

## System Configuration
- [ ] Company branding applied to interface
- [ ] User accounts created with appropriate permissions
- [ ] Workflow templates customized for client needs
- [ ] Integration connections established
- [ ] Notification preferences configured
- [ ] Reporting schedules set up

## Training and Documentation
- [ ] Admin training session completed
- [ ] User training materials provided
- [ ] Business guide customized for client
- [ ] Support contacts and escalation procedures shared
- [ ] Knowledge base access provided

## Go-Live Activities
- [ ] Production data migration (if applicable)
- [ ] Final workflow testing with real data
- [ ] Performance verification under load
- [ ] Monitoring alerts configured
- [ ] Success metrics baseline established
- [ ] Go-live checklist completed
```

### 2. Client Training Script

Create `client-training-agenda.md`:

```markdown
# Client Training Agenda

## Session 1: Platform Overview (60 minutes)
### Business Value Proposition (15 minutes)
- ROI calculator demonstration
- Cost savings examples
- Efficiency improvements showcase
- Success stories from similar businesses

### Platform Navigation (15 minutes)
- Dashboard overview
- Main navigation areas
- Key performance indicators
- Quick access features

### Business Metrics Dashboard (15 minutes)
- Revenue and profit tracking
- Customer metrics
- Workflow automation impact
- Trend analysis and reporting

### Q&A and Initial Assessment (15 minutes)
- Client questions and concerns
- Current process pain points
- Priority workflows for implementation
- Timeline expectations

## Session 2: Workflow Management (90 minutes)
### Workflow Fundamentals (20 minutes)
- How workflows save time and money
- Common SMB workflow patterns
- Integration capabilities
- Security and compliance features

### Hands-on: Invoice Processing Setup (30 minutes)
- Template selection and customization
- Data source configuration
- Processing rules definition
- Testing and validation

### Hands-on: Email Marketing Automation (25 minutes)
- Campaign template setup
- Customer segmentation
- Automated sequences
- Performance tracking

### Monitoring and Troubleshooting (15 minutes)
- Execution monitoring
- Error handling and notifications
- Performance optimization
- Maintenance best practices

## Session 3: Advanced Features and Administration (60 minutes)
### User Management (15 minutes)
- Adding team members
- Permission management
- Role-based access control
- Security settings

### Reporting and Analytics (20 minutes)
- Custom report creation
- Scheduled reporting
- Data export options
- Executive dashboards

### Integration Management (15 minutes)
- Third-party service connections
- API key management
- Webhook configuration
- Data synchronization

### Support and Next Steps (10 minutes)
- Support channels and contacts
- Documentation resources
- Feature request process
- Upcoming enhancements
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

**Symptoms:**
- PM2 shows app as errored
- 502 Bad Gateway errors
- Service unavailable messages

**Diagnosis:**
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs n8n-workflow-backend

# Check system resources
free -h
df -h
```

**Solutions:**
```bash
# Restart application
pm2 restart n8n-workflow-backend

# Check for port conflicts
sudo netstat -tulpn | grep :3000

# Verify environment variables
pm2 env 0

# Check database connectivity
PGPASSWORD=SecurePassword123! psql -h localhost -U n8n_workflow_user -d n8n_workflow_manager -c "SELECT 1;"
```

#### 2. Database Connection Issues

**Symptoms:**
- Database connection errors in logs
- Authentication failures
- Slow query performance

**Diagnosis:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
PGPASSWORD=SecurePassword123! psql -h localhost -U n8n_workflow_user -d n8n_workflow_manager
```

**Solutions:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check configuration
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Monitor connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Analyze slow queries
sudo -u postgres psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### 3. SSL Certificate Issues

**Symptoms:**
- SSL certificate warnings
- HTTPS redirects failing
- Certificate expiration notices

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check Nginx configuration
sudo nginx -t
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run

# Update Nginx configuration
sudo systemctl reload nginx

# Check auto-renewal cron job
sudo crontab -l | grep certbot
```

#### 4. Performance Issues

**Symptoms:**
- Slow page loading
- High server resource usage
- Timeout errors

**Diagnosis:**
```bash
# Check system resources
top
htop
iotop

# Check application performance
pm2 monit

# Analyze nginx logs
sudo tail -f /var/log/nginx/access.log
```

**Solutions:**
```bash
# Optimize database
sudo -u postgres psql n8n_workflow_manager -c "VACUUM ANALYZE;"

# Clear application cache
redis-cli -a YourRedisPassword123! FLUSHDB

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Scale application instances
pm2 scale n8n-workflow-backend +1
```

#### 5. Workflow Execution Failures

**Symptoms:**
- Workflows stuck in running state
- Execution errors in n8n
- Missing webhook responses

**Diagnosis:**
```bash
# Check n8n status
pm2 logs n8n

# Check webhook connectivity
curl -X POST https://yourdomain.com/webhook/test

# Monitor workflow executions
tail -f /home/n8nworkflow/logs/n8n-combined.log
```

**Solutions:**
```bash
# Restart n8n
pm2 restart n8n

# Clear n8n cache
rm -rf /home/n8nworkflow/.n8n/cache/*

# Check n8n database
PGPASSWORD=n8nDbPassword123! psql -h localhost -U n8n_user -d n8n_workflows -c "SELECT * FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"

# Reset failed executions
# Access n8n UI and manually reset stuck executions
```

### Emergency Recovery Procedures

#### 1. Complete System Recovery

```bash
#!/bin/bash
# Emergency recovery script

echo "Starting emergency recovery procedure..."

# Stop all services
pm2 stop all
sudo systemctl stop nginx
sudo systemctl stop postgresql
sudo systemctl stop redis

# Check system resources
df -h
free -h

# Start core services
sudo systemctl start postgresql
sudo systemctl start redis

# Wait for services to initialize
sleep 10

# Restore from latest backup if needed
# /home/n8nworkflow/restore-db.sh LATEST_BACKUP_DATE

# Start applications
pm2 start all
sudo systemctl start nginx

# Verify recovery
/home/n8nworkflow/health-check.sh

echo "Emergency recovery completed"
```

#### 2. Data Recovery

```bash
#!/bin/bash
# Data recovery from backup

BACKUP_DATE=$1
if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -la /home/n8nworkflow/backups/*.sql.gz | head -10
    exit 1
fi

echo "Starting data recovery for backup: $BACKUP_DATE"

# Create recovery point
pg_dump n8n_workflow_manager > /tmp/pre_recovery_backup.sql

# Stop applications
pm2 stop all

# Restore data
gunzip -c /home/n8nworkflow/backups/main_db_$BACKUP_DATE.sql.gz | psql n8n_workflow_manager

# Start applications
pm2 start all

echo "Data recovery completed"
```

### Support and Maintenance

#### Regular Maintenance Tasks

Create `maintenance.sh`:

```bash
#!/bin/bash
# Regular maintenance script

echo "Starting maintenance tasks..."

# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Clean old logs
find /home/n8nworkflow/logs -name "*.log" -mtime +30 -delete

# Clean old backups
find /home/n8nworkflow/backups -name "*.sql.gz" -mtime +90 -delete

# Optimize database
sudo -u postgres psql n8n_workflow_manager -c "VACUUM ANALYZE;"

# Clear Redis cache
redis-cli -a YourRedisPassword123! FLUSHDB

# Restart applications for fresh start
pm2 restart all

# Check SSL certificate expiration
certbot certificates

# Generate maintenance report
cat > /tmp/maintenance_report.txt << EOF
Maintenance Report - $(date)
===============================

System Status:
$(pm2 list)

Disk Usage:
$(df -h)

Memory Usage:
$(free -h)

SSL Certificates:
$(certbot certificates)

Health Check:
$(bash /home/n8nworkflow/health-check.sh)
EOF

# Email report if configured
# mail -s "Maintenance Report - $(hostname)" admin@yourdomain.com < /tmp/maintenance_report.txt

echo "Maintenance completed"
```

## Conclusion

This deployment guide provides a comprehensive foundation for deploying the n8n Workflow Manager in production environments for SMB clients. The platform is designed to deliver immediate business value through:

1. **Automated Business Processes** - Reducing manual work and human error
2. **Real-time Business Metrics** - Providing actionable insights for decision making
3. **ROI Tracking** - Demonstrating clear return on automation investments
4. **Scalable Architecture** - Growing with the business needs
5. **Enterprise Security** - Protecting sensitive business data

### Key Success Factors

1. **Proper Planning** - Complete pre-deployment checklist thoroughly
2. **Security First** - Implement all security measures from day one
3. **Monitoring** - Set up comprehensive monitoring and alerting
4. **Documentation** - Maintain detailed documentation for client handoff
5. **Training** - Ensure client team is properly trained on the platform
6. **Support** - Establish clear support channels and procedures

### Next Steps

After successful deployment:

1. Monitor system performance and optimize as needed
2. Gather client feedback and implement improvements
3. Expand workflow coverage based on business needs
4. Prepare for scaling as the business grows
5. Stay updated with platform updates and security patches

For additional support or questions, refer to the technical documentation or contact the development team.