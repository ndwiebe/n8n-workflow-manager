import { WorkflowModule } from '../types';

export const mockWorkflowModules: WorkflowModule[] = [
  {
    id: 'invoice-processor',
    name: 'Invoice Processing Automation',
    description: 'Automatically extract data from invoices, validate amounts, and sync with your accounting software.',
    category: 'Finance',
    icon: 'Receipt',
    requiredCredentials: [
      {
        name: 'ocrApiKey',
        label: 'OCR API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your OCR service API key',
        helpText: 'Get your API key from your OCR provider dashboard'
      },
      {
        name: 'accountingSoftware',
        label: 'Accounting Software',
        type: 'select',
        required: true,
        options: [
          { value: 'quickbooks', label: 'QuickBooks' },
          { value: 'xero', label: 'Xero' },
          { value: 'sage', label: 'Sage' }
        ]
      },
      {
        name: 'accountingApiKey',
        label: 'Accounting API Key',
        type: 'password',
        required: true
      }
    ],
    externalTools: ['OCR Service', 'QuickBooks/Xero/Sage API', 'Email Parser'],
    features: [
      'Automatic invoice data extraction',
      'Multi-currency support',
      'Duplicate detection',
      'Approval workflow integration'
    ],
    estimatedSetupTime: '5-7 days',
    monthlyPrice: 99
  },
  {
    id: 'email-automation',
    name: 'Email Campaign Automation',
    description: 'Create sophisticated email campaigns with behavioral triggers, A/B testing, and analytics.',
    category: 'Marketing',
    icon: 'Email',
    requiredCredentials: [
      {
        name: 'smtpHost',
        label: 'SMTP Host',
        type: 'text',
        required: true,
        placeholder: 'smtp.example.com'
      },
      {
        name: 'smtpPort',
        label: 'SMTP Port',
        type: 'text',
        required: true,
        placeholder: '587'
      },
      {
        name: 'smtpUser',
        label: 'SMTP Username',
        type: 'text',
        required: true
      },
      {
        name: 'smtpPassword',
        label: 'SMTP Password',
        type: 'password',
        required: true
      },
      {
        name: 'analyticsApiKey',
        label: 'Analytics API Key',
        type: 'password',
        required: false,
        helpText: 'Optional: Connect to Google Analytics or similar'
      }
    ],
    externalTools: ['SMTP Server', 'Google Analytics', 'Mailchimp API'],
    features: [
      'Behavioral email triggers',
      'A/B testing capabilities',
      'Advanced segmentation',
      'Real-time analytics',
      'Template designer'
    ],
    estimatedSetupTime: '3-5 days',
    monthlyPrice: 149
  },
  {
    id: 'customer-support',
    name: 'AI Customer Support Agent',
    description: 'Intelligent chatbot that handles customer inquiries, integrates with your knowledge base, and escalates complex issues.',
    category: 'Customer Service',
    icon: 'Support',
    requiredCredentials: [
      {
        name: 'openaiApiKey',
        label: 'OpenAI API Key',
        type: 'password',
        required: true,
        helpText: 'Required for AI responses'
      },
      {
        name: 'knowledgeBaseUrl',
        label: 'Knowledge Base URL',
        type: 'url',
        required: true,
        placeholder: 'https://kb.example.com'
      },
      {
        name: 'supportTicketApi',
        label: 'Support Ticket System',
        type: 'select',
        required: true,
        options: [
          { value: 'zendesk', label: 'Zendesk' },
          { value: 'freshdesk', label: 'Freshdesk' },
          { value: 'intercom', label: 'Intercom' }
        ]
      },
      {
        name: 'ticketApiKey',
        label: 'Ticket System API Key',
        type: 'password',
        required: true
      }
    ],
    externalTools: ['OpenAI GPT-4', 'Zendesk/Freshdesk', 'Knowledge Base API'],
    features: [
      '24/7 automated responses',
      'Multi-language support',
      'Sentiment analysis',
      'Smart ticket routing',
      'Performance analytics'
    ],
    estimatedSetupTime: '7-10 days',
    monthlyPrice: 299
  },
  {
    id: 'inventory-sync',
    name: 'Multi-Channel Inventory Sync',
    description: 'Keep inventory synchronized across multiple e-commerce platforms, warehouses, and POS systems.',
    category: 'E-commerce',
    icon: 'Inventory',
    requiredCredentials: [
      {
        name: 'shopifyApiKey',
        label: 'Shopify API Key',
        type: 'password',
        required: false,
        helpText: 'If you use Shopify'
      },
      {
        name: 'woocommerceKey',
        label: 'WooCommerce API Key',
        type: 'password',
        required: false,
        helpText: 'If you use WooCommerce'
      },
      {
        name: 'amazonMws',
        label: 'Amazon MWS Credentials',
        type: 'file',
        required: false,
        helpText: 'Upload your MWS credentials JSON'
      },
      {
        name: 'warehouseApi',
        label: 'Warehouse Management System',
        type: 'url',
        required: true,
        placeholder: 'https://wms.example.com/api'
      }
    ],
    externalTools: ['Shopify', 'WooCommerce', 'Amazon MWS', 'Custom WMS'],
    features: [
      'Real-time inventory updates',
      'Low stock alerts',
      'Multi-location support',
      'Batch update capabilities',
      'Audit trail'
    ],
    estimatedSetupTime: '5-7 days',
    monthlyPrice: 199
  },
  {
    id: 'social-media',
    name: 'Social Media Content Scheduler',
    description: 'Schedule and publish content across multiple social media platforms with AI-powered suggestions.',
    category: 'Marketing',
    icon: 'Share',
    requiredCredentials: [
      {
        name: 'facebookToken',
        label: 'Facebook Page Token',
        type: 'password',
        required: false
      },
      {
        name: 'twitterApiKey',
        label: 'Twitter API Key',
        type: 'password',
        required: false
      },
      {
        name: 'linkedinToken',
        label: 'LinkedIn Access Token',
        type: 'password',
        required: false
      },
      {
        name: 'instagramToken',
        label: 'Instagram Business Token',
        type: 'password',
        required: false
      },
      {
        name: 'contentAiKey',
        label: 'Content AI API Key',
        type: 'password',
        required: true,
        helpText: 'For AI-powered content suggestions'
      }
    ],
    externalTools: ['Facebook API', 'Twitter API', 'LinkedIn API', 'Instagram API', 'OpenAI'],
    features: [
      'Multi-platform posting',
      'Content calendar',
      'AI content suggestions',
      'Optimal timing recommendations',
      'Engagement analytics'
    ],
    estimatedSetupTime: '3-5 days',
    monthlyPrice: 129
  },
  {
    id: 'data-backup',
    name: 'Automated Data Backup & Recovery',
    description: 'Schedule automatic backups of your critical business data with encryption and easy recovery options.',
    category: 'Infrastructure',
    icon: 'Backup',
    requiredCredentials: [
      {
        name: 'storageProvider',
        label: 'Cloud Storage Provider',
        type: 'select',
        required: true,
        options: [
          { value: 'aws', label: 'Amazon S3' },
          { value: 'google', label: 'Google Cloud Storage' },
          { value: 'azure', label: 'Azure Blob Storage' }
        ]
      },
      {
        name: 'storageKey',
        label: 'Storage Access Key',
        type: 'password',
        required: true
      },
      {
        name: 'storageSecret',
        label: 'Storage Secret Key',
        type: 'password',
        required: true
      },
      {
        name: 'encryptionKey',
        label: 'Encryption Key',
        type: 'password',
        required: true,
        helpText: 'Your data will be encrypted with this key'
      }
    ],
    externalTools: ['AWS S3/Google Cloud/Azure', 'Database APIs', 'Encryption Service'],
    features: [
      'Automated daily backups',
      'Point-in-time recovery',
      'End-to-end encryption',
      'Backup verification',
      'Disaster recovery planning'
    ],
    estimatedSetupTime: '2-3 days',
    monthlyPrice: 79
  },
  {
    id: 'slack-integration',
    name: 'Slack Workspace Automation',
    description: 'Automate Slack notifications, channel management, and team communications with smart triggers and responses.',
    category: 'Communication',
    icon: 'Chat',
    requiredCredentials: [
      {
        name: 'slackBotToken',
        label: 'Slack Bot Token',
        type: 'password',
        required: true,
        placeholder: 'xoxb-your-bot-token',
        helpText: 'Create a Slack app and get the bot token from OAuth & Permissions'
      },
      {
        name: 'slackAppToken',
        label: 'Slack App Token',
        type: 'password',
        required: true,
        placeholder: 'xapp-your-app-token',
        helpText: 'Socket Mode app token for real-time events'
      },
      {
        name: 'webhookUrl',
        label: 'Incoming Webhook URL',
        type: 'url',
        required: false,
        placeholder: 'https://hooks.slack.com/services/...',
        helpText: 'Optional: For simple message posting'
      }
    ],
    externalTools: ['Slack API', 'Slack Events API', 'Slack Web API'],
    features: [
      'Automated channel notifications',
      'Smart message routing',
      'Team presence monitoring',
      'Custom slash commands',
      'File sharing automation',
      'Meeting scheduler integration'
    ],
    estimatedSetupTime: '1-2 days',
    monthlyPrice: 59
  }
];