# 🚀 SMB Business Automation Platform - Setup Guide

## Quick Start (Recommended)

### Step 1: Configure Your n8n Connection

1. **Update your environment variables**:
   ```bash
   # Edit the .env file
   nano .env
   
   # Replace with your actual values:
   REACT_APP_N8N_URL=https://your-n8n-domain.com  # Your Hetzner n8n URL
   REACT_APP_N8N_API_KEY=your-api-key-here        # Get from n8n Settings → API Keys
   ```

2. **Get your n8n API Key**:
   - Open your n8n instance in browser
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Copy the key to your `.env` file

### Step 2: Test the Connection

```bash
# Start the app
npm start

# The app will attempt to connect to your n8n instance
# Check browser console for any connection errors
```

### Step 3: Quick Fixes Applied ✅

- **ROI Calculator**: Now expanded by default with better input validation
- **n8n Integration**: Service created to connect to your Hetzner instance
- **Environment Config**: Ready for your n8n details

---

## 📋 What You Need to Provide

Please share these details to complete the setup:

1. **n8n Instance URL**: `https://your-domain.com` or `http://your-ip:5678`
2. **n8n API Key**: From your n8n Settings → API Keys
3. **Domain preference**: For deployment (optional)

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │───▶│  Hetzner n8n    │───▶│  Your External │
│  (This App)     │    │  Instance       │    │  Integrations   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐
│  Mock API Data  │  (Phase 1)
│  Real Backend   │  (Phase 2)
└─────────────────┘
```

---

## 🎯 Phase 1: Demo Ready (Current Status)

### ✅ Completed
- Frontend application with all UI components
- n8n integration service for connecting to your instance
- ROI calculator with working inputs
- Business metrics dashboard
- Workflow management interface
- Mobile responsive design

### 📋 Remaining Tasks
1. **Add your n8n URL and API key** to `.env`
2. **Test connection** to your Hetzner n8n
3. **Optional**: Deploy to Vercel/Netlify for easy sharing

---

## 🚀 Phase 2: Production Backend (Later)

### Backend API Features
```bash
# Endpoints to implement:
POST /api/auth/login
POST /api/auth/register
GET  /api/workflows
POST /api/workflows/configure
GET  /api/metrics/business-impact
GET  /api/privacy/user-data
POST /api/privacy/export
```

### Database Schema
- Users & Authentication
- Workflow Configurations
- Business Metrics Tracking
- Privacy & Compliance Records

---

## 🌐 Deployment Options

### Option 1: Vercel (Frontend Only)
```bash
npm install -g vercel
vercel --prod
```

### Option 2: Hetzner VPS (Full Stack)
```bash
# Deploy alongside your n8n instance
# Backend API + Frontend + Database
```

### Option 3: Hybrid (Frontend + n8n)
```bash
# Frontend on Vercel
# Backend services on Hetzner with n8n
```

---

## 🔧 Configuration Files

### Environment Variables (`.env`)
```bash
# n8n Configuration
REACT_APP_N8N_URL=https://your-n8n-domain.com
REACT_APP_N8N_API_KEY=your-api-key-here

# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_USE_MOCK_DATA=true

# Application Settings
REACT_APP_APP_NAME=SMB Automation Platform
REACT_APP_VERSION=1.0.0
```

### Package.json Scripts
```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "deploy": "npm run build && vercel --prod"
}
```

---

## 🆘 Troubleshooting

### Common Issues

1. **CORS Error with n8n**
   ```bash
   # Add to your n8n docker-compose.yml:
   N8N_CORS_ORIGIN=https://your-frontend-domain.com
   ```

2. **API Key Not Working**
   ```bash
   # Verify API key in n8n UI
   # Check browser network tab for 401 errors
   ```

3. **Connection Refused**
   ```bash
   # Check if n8n is running on Hetzner
   curl https://your-n8n-domain.com/api/v1/health
   ```

---

## 📞 Next Steps

**Ready to proceed? Please provide:**
1. Your n8n instance URL
2. Your n8n API key
3. Preferred deployment method

Then I can:
- ✅ Complete the n8n integration
- ✅ Test all functionality end-to-end
- ✅ Deploy the frontend for demo
- 🚀 Plan the backend architecture (Phase 2)