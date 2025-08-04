# n8n Workflow Manager

A modern, modular web application for managing n8n workflow integrations. This client-facing interface allows businesses to easily configure and activate various workflow modules with a clean, intuitive UI.

## Features

- **Modular Workflow System**: Each workflow is a separate module that can be toggled on/off
- **Secure Credential Management**: Encrypted storage of API keys and credentials
- **Status Tracking**: Real-time status indicators for each workflow
- **Category Filtering**: Organize workflows by category (Finance, Marketing, etc.)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **User Authentication**: Secure login system with role-based access
- **Setup Scheduling**: Workflows are scheduled for activation within 1 week

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI)
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Routing**: React Router v6
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- A backend API server (mock API included for development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Credentials

- Email: `demo@example.com`
- Password: `password`

## Available Workflow Modules

1. **Invoice Processing Automation** - Extract and sync invoice data
2. **Email Campaign Automation** - Create sophisticated email campaigns
3. **AI Customer Support Agent** - Intelligent chatbot integration
4. **Multi-Channel Inventory Sync** - Sync inventory across platforms
5. **Social Media Content Scheduler** - Schedule posts across platforms
6. **Automated Data Backup & Recovery** - Schedule automatic backups

## License

MIT