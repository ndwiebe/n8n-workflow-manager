# n8n Workflow Manager - Backend Installation Guide

This guide provides step-by-step instructions for setting up and connecting the backend API to your n8n Workflow Manager frontend.

## 📋 Prerequisites

Before starting, ensure you have:
- Node.js 18.0.0 or higher installed
- npm or yarn package manager
- Git (for cloning/managing the repository)
- A text editor or IDE (VS Code recommended)

## 🚀 Quick Start

### 1. Navigate to Backend Directory

```bash
cd /mnt/c/Users/n.wiebe/Projects/n8n-workflow-manager/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

### 4. Create Required Directories

```bash
# Create logs directory
mkdir -p logs

# Ensure data directory exists
mkdir -p data/workflow-templates
```

### 5. Start the Development Server

```bash
npm run dev
```

The backend server will start on `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # JWT authentication
│   │   └── errorHandler.ts # Error handling
│   ├── routes/             # API routes
│   │   ├── auth.ts        # Authentication routes
│   │   ├── workflows.ts   # Workflow management
│   │   ├── clients.ts     # Client management
│   │   ├── analytics.ts   # Analytics endpoints
│   │   └── admin.ts       # Admin endpoints
│   ├── services/           # Business logic
│   │   ├── templateLoader.ts    # Template management
│   │   ├── provisioningService.ts # Workflow provisioning
│   │   └── secretsManager.ts    # Credential management
│   ├── utils/              # Utility functions
│   │   └── logger.ts       # Winston logger
│   └── server.ts           # Main server file
├── data/
│   └── workflow-templates/ # JSON template files
├── logs/                   # Log files (auto-created)
├── .env.example           # Environment template
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## 🔧 Configuration

### Environment Variables

Edit your `.env` file with the following settings:

```env
# Essential Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Security
ENCRYPTION_KEY=your-encryption-key-for-secrets-manager
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Templates
TEMPLATES_PATH=./data/workflow-templates

# Development
DEBUG=true
CORS_ORIGIN=http://localhost:3000
```

### Required Directory Structure

Ensure these directories exist:
```bash
mkdir -p logs
mkdir -p data/workflow-templates
```

## 🔌 Frontend Integration

### 1. Update Frontend API Base URL

In your React frontend, update the API base URL to point to your backend:

```typescript
// In your frontend API configuration
const API_BASE_URL = 'http://localhost:3001/api';
```

### 2. Update Frontend Auth Store

Modify your frontend auth store to use the new API endpoints:

```typescript
// Example API calls in your frontend
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};
```

### 3. Enable CORS

The backend is configured to accept requests from `http://localhost:3000` by default. If your frontend runs on a different port, update the `FRONTEND_URL` in your `.env` file.

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/validate` - Validate token

### Workflows
- `GET /api/workflows/templates` - Get available templates
- `GET /api/workflows/templates/:id` - Get specific template
- `POST /api/workflows/provision` - Start workflow provisioning
- `GET /api/workflows/jobs/:jobId` - Get job status
- `GET /api/workflows/jobs` - Get user jobs
- `POST /api/workflows/jobs/:id/schedule` - Schedule activation
- `DELETE /api/workflows/jobs/:id` - Cancel job
- `POST /api/workflows/validate-config` - Validate configuration

### Admin (Admin access required)
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/system/info` - System information
- `GET /api/admin/logs` - Application logs
- `POST /api/admin/templates/reload` - Reload templates
- `POST /api/admin/system/maintenance` - Toggle maintenance mode

### Clients (Admin access required)
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get specific client
- `GET /api/clients/stats` - Client statistics

### Analytics (Admin access required)
- `GET /api/analytics/overview` - Analytics overview
- `GET /api/analytics/daily` - Daily analytics
- `GET /api/analytics/workflows` - Workflow analytics
- `GET /api/analytics/users` - User analytics
- `GET /api/analytics/performance` - Performance metrics

## 🔐 Authentication & Security

### Demo Users

The system comes with pre-configured demo users:

**Regular User:**
- Email: `demo@example.com`
- Password: `demo123`

**Admin User:**
- Email: `admin@n8nmanager.com`
- Password: `admin123`

### JWT Token Authentication

All API endpoints (except login) require a valid JWT token:

```javascript
// Include in request headers
{
  "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
}
```

### Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation with express-validator
- Secure credential storage with AES-256-GCM encryption

## 🛠️ Development Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

## 📊 Monitoring & Logging

### Log Files

Logs are stored in the `logs/` directory:
- `error.log` - Error level logs
- `combined.log` - All logs

### Log Levels

Configure log level in `.env`:
```env
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Health Check

Monitor server health:
```bash
curl http://localhost:3001/health
```

## 🔄 Workflow Provisioning

### How It Works

1. **Template Selection** - User selects a workflow template
2. **Configuration** - User provides required credentials/settings
3. **Validation** - System validates configuration
4. **Provisioning** - Background service creates workflow
5. **Testing** - System tests the workflow
6. **Activation** - Workflow is ready for use

### Provisioning States

- `pending` - Job created, waiting to start
- `validating` - Validating configuration
- `provisioning` - Creating workflow instance
- `configuring` - Applying user settings
- `testing` - Testing workflow functionality
- `ready` - Workflow ready for activation
- `scheduled` - Scheduled for future activation
- `active` - Workflow is running
- `failed` - Provisioning failed

## 🎯 Template Management

### Adding New Templates

1. Create a JSON file in `data/workflow-templates/`
2. Follow the template schema:

```json
{
  "id": "unique-template-id",
  "name": "Template Name",
  "description": "Template description",
  "category": "Category",
  "icon": "IconName",
  "fields": [
    {
      "key": "field_name",
      "label": "Field Label",
      "type": "text|email|password|select|checkbox",
      "required": true,
      "validation": {
        "pattern": "regex_pattern",
        "message": "Error message"
      }
    }
  ],
  "features": ["Feature 1", "Feature 2"],
  "externalTools": ["Tool 1", "Tool 2"],
  "monthlyPrice": 99
}
```

3. Reload templates via admin API:
```bash
curl -X POST http://localhost:3001/api/admin/templates/reload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🚨 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
lsof -i :3001

# Check logs
tail -f logs/error.log

# Verify environment variables
cat .env
```

#### CORS Errors
```bash
# Update FRONTEND_URL in .env
FRONTEND_URL=http://localhost:3000
```

#### Template Loading Errors
```bash
# Check templates directory
ls -la data/workflow-templates/

# Check template file permissions
chmod 644 data/workflow-templates/*.json
```

#### Database Connection Issues
```bash
# For future database integration
# Check DATABASE_URL in .env
# Verify database is running
```

### Debug Mode

Enable debug mode for detailed logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## 🚀 Production Deployment

### Build Application
```bash
npm run build
```

### Environment Variables

For production, update these critical variables:
```env
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-production-encryption-key
FRONTEND_URL=https://your-frontend-domain.com
DATABASE_URL=your-production-database-url
```

### Hetzner Server Deployment

For deployment on Hetzner with self-hosted n8n:

#### 1. Update Production Environment Variables

```env
# Production Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com

# Database Configuration (PostgreSQL on Hetzner)
DATABASE_URL=postgresql://username:password@your-hetzner-server-ip:5432/n8n_workflow_manager
DB_HOST=your-hetzner-server-ip
DB_PORT=5432
DB_NAME=n8n_workflow_manager
DB_USER=your-postgres-username
DB_PASSWORD=your-postgres-password

# n8n Integration (Self-hosted)
N8N_BASE_URL=https://your-n8n-domain.com
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook

# Qdrant Vector Database
QDRANT_URL=http://your-hetzner-server-ip:6333
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION_NAME=workflow_embeddings

# Security
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-production-encryption-key
```

#### 2. Docker Compose Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  n8n-workflow-manager:
    image: node:18-alpine
    container_name: n8n-workflow-manager
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - qdrant
    command: sh -c "npm install && npm run build && npm start"
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: postgres-n8n-manager
    environment:
      POSTGRES_DB: n8n_workflow_manager
      POSTGRES_USER: your-postgres-username
      POSTGRES_PASSWORD: your-postgres-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-n8n-manager
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

volumes:
  postgres_data:
  qdrant_data:
```

#### 3. Deploy to Hetzner

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f n8n-workflow-manager
```

### Process Management

Use PM2 for production process management:
```bash
npm install -g pm2
pm2 start dist/server.js --name "n8n-workflow-manager"
pm2 startup
pm2 save
```

### Reverse Proxy

Configure nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name your-api-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📞 Support

### Getting Help

1. Check the logs in `logs/` directory
2. Review the API documentation
3. Check GitHub issues
4. Contact support team

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Happy coding! 🎉**

For additional help or questions, please refer to the project documentation or contact the development team.