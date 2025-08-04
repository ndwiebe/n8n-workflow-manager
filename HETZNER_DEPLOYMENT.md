# Hetzner Deployment Guide for n8n Workflow Manager

This guide provides detailed instructions for deploying the n8n Workflow Manager on Hetzner with self-hosted n8n, PostgreSQL, and Qdrant.

## 🏗️ Architecture Overview

```
Hetzner Server
├── n8n (Docker container)
├── PostgreSQL (Docker container)  
├── Qdrant (Docker container)
├── n8n Workflow Manager Backend (Docker container)
├── Frontend (Static files served by nginx)
└── nginx (Reverse proxy)
```

## 📋 Prerequisites

- Hetzner Cloud server (minimum 4GB RAM, 2 CPU cores)
- Docker and Docker Compose installed
- Domain name pointed to your server IP
- SSL certificate (Let's Encrypt recommended)
- Basic knowledge of Linux server administration

## 🚀 Step-by-Step Deployment

### 1. Server Setup

#### Connect to your Hetzner server:
```bash
ssh root@your-hetzner-server-ip
```

#### Update system packages:
```bash
apt update && apt upgrade -y
```

#### Install Docker and Docker Compose:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### Install nginx:
```bash
apt install nginx -y
```

### 2. Clone and Setup Project

```bash
# Clone your project
git clone https://github.com/your-username/n8n-workflow-manager.git
cd n8n-workflow-manager

# Create production environment file
cp backend/.env.example backend/.env.production
```

### 3. Configure Environment Variables

Edit `backend/.env.production`:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-production
JWT_EXPIRATION=24h

# Database Configuration
DATABASE_URL=postgresql://n8n_manager:secure_password@postgres:5432/n8n_workflow_manager
DB_HOST=postgres
DB_PORT=5432
DB_NAME=n8n_workflow_manager
DB_USER=n8n_manager
DB_PASSWORD=secure_password

# n8n Integration
N8N_BASE_URL=https://your-n8n-domain.com
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook
N8N_WEBHOOK_PATH=/webhook-test/workflow-manager

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION_NAME=workflow_embeddings

# Security
ENCRYPTION_KEY=your-encryption-key-for-secrets-manager
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### 4. Docker Compose Configuration

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres-n8n-manager
    environment:
      POSTGRES_DB: n8n_workflow_manager
      POSTGRES_USER: n8n_manager
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - n8n-network

  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-n8n-manager
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped
    networks:
      - n8n-network

  # n8n Workflow Engine
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-engine
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-n8n-password
      - N8N_HOST=your-n8n-domain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-n8n-domain.com/
      - GENERIC_TIMEZONE=UTC
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n_user
      - DB_POSTGRESDB_PASSWORD=n8n_password
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - n8n-network

  # n8n Workflow Manager Backend
  workflow-manager:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: n8n-workflow-manager
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env.production
    volumes:
      - ./backend/logs:/app/logs
      - ./backend/data:/app/data
    depends_on:
      - postgres
      - qdrant
      - n8n
    restart: unless-stopped
    networks:
      - n8n-network

volumes:
  postgres_data:
  qdrant_data:
  n8n_data:

networks:
  n8n-network:
    driver: bridge
```

### 5. Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p logs data/workflow-templates

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

### 6. Database Initialization

Create `backend/init.sql`:

```sql
-- Create n8n database
CREATE DATABASE n8n;
CREATE USER n8n_user WITH ENCRYPTED PASSWORD 'n8n_password';
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;

-- Create workflow manager tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    credentials JSONB,
    activated_at TIMESTAMP,
    scheduled_activation TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    workflow_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workflow_configurations_user_id ON workflow_configurations(user_id);
CREATE INDEX idx_provisioning_jobs_user_id ON provisioning_jobs(user_id);
```

### 7. nginx Configuration

Create `/etc/nginx/sites-available/n8n-workflow-manager`:

```nginx
# Frontend
server {
    listen 80;
    server_name your-frontend-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-frontend-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-frontend-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-frontend-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend files
    root /var/www/n8n-workflow-manager;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# n8n Instance
server {
    listen 80;
    server_name your-n8n-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-n8n-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-n8n-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-n8n-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
    }
}
```

### 8. SSL Certificate Setup

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificates
certbot --nginx -d your-frontend-domain.com
certbot --nginx -d api.your-domain.com  
certbot --nginx -d your-n8n-domain.com

# Enable nginx site
ln -s /etc/nginx/sites-available/n8n-workflow-manager /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 9. Deploy Application

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Build and deploy frontend
cd frontend
npm install
npm run build
cp -r build/* /var/www/n8n-workflow-manager/
```

### 10. Setup Monitoring

Create `monitoring/docker-compose.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-grafana-password
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

## 🔧 Configuration Details

### n8n API Key Setup

1. Access your n8n instance at `https://your-n8n-domain.com`
2. Go to Settings → API Keys
3. Create a new API key
4. Update the `N8N_API_KEY` in your `.env.production` file

### Qdrant Collection Setup

```bash
# Create collection for workflow embeddings
curl -X PUT 'http://your-hetzner-server-ip:6333/collections/workflow_embeddings' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

## 🚨 Security Considerations

### Firewall Setup

```bash
# Configure UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### Regular Updates

```bash
# Create update script
cat > /root/update-system.sh << 'EOF'
#!/bin/bash
apt update && apt upgrade -y
docker-compose -f /path/to/docker-compose.production.yml pull
docker-compose -f /path/to/docker-compose.production.yml up -d
docker system prune -f
EOF

chmod +x /root/update-system.sh

# Setup cron job
crontab -e
# Add: 0 2 * * 0 /root/update-system.sh
```

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f workflow-manager

# Check API health
curl https://api.your-domain.com/health
```

### Backup Strategy

```bash
# Database backup
docker exec postgres-n8n-manager pg_dump -U n8n_manager n8n_workflow_manager > backup-$(date +%Y%m%d).sql

# Qdrant backup  
docker exec qdrant-n8n-manager ./qdrant --uri http://localhost:6333 backup create
```

## 🔄 Deployment Commands

```bash
# Full deployment
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Update single service
docker-compose -f docker-compose.production.yml up -d --no-deps workflow-manager

# View logs
docker-compose -f docker-compose.production.yml logs -f workflow-manager
```

## 🎯 Post-Deployment Verification

1. **Test all endpoints:**
   - Frontend: `https://your-frontend-domain.com`
   - API: `https://api.your-domain.com/health`
   - n8n: `https://your-n8n-domain.com`

2. **Verify database connections:**
   ```bash
   docker exec -it postgres-n8n-manager psql -U n8n_manager -d n8n_workflow_manager -c "SELECT NOW();"
   ```

3. **Test workflow provisioning:**
   - Login to frontend
   - Create a test workflow
   - Check job status

4. **Monitor logs:**
   ```bash
   tail -f /var/log/nginx/access.log
   docker-compose -f docker-compose.production.yml logs -f
   ```

## 📞 Support and Troubleshooting

### Common Issues

1. **SSL Certificate Issues:**
   ```bash
   certbot renew --dry-run
   ```

2. **Database Connection Issues:**
   ```bash
   docker exec -it postgres-n8n-manager psql -U n8n_manager -d n8n_workflow_manager
   ```

3. **Service Not Starting:**
   ```bash
   docker-compose -f docker-compose.production.yml logs workflow-manager
   ```

### Performance Optimization

1. **Enable nginx caching**
2. **Configure PostgreSQL for production**
3. **Set up Redis for session storage**
4. **Enable Docker BuildKit for faster builds**

---

**Your n8n Workflow Manager is now fully deployed on Hetzner! 🚀**

For additional help, refer to the main project documentation or contact support.