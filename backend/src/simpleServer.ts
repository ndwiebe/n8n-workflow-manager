import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import unifiedWorkflowsRouter from './routes/unifiedWorkflows';
import workflowRoutes from './routes/workflows';
import { initializeTemplateData } from './database/inMemoryStore';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Override with proxy-based n8n configuration
process.env.N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://127.0.0.1:3002/api/n8n';
process.env.N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDhmMmUwMy03NTRmLTRjYmMtYjhiZS0wNmU0YzI3MmNhMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0OTY4NjQwLCJleHAiOjE3NjAwNjg4MDB9.bMKdULgmzClInJr3jvsbdGxkjC8eofvqJmtC4ThyQUA';
process.env.PROXY_API_KEY = process.env.PROXY_API_KEY || 'dev-proxy-key-12345';

console.log('Environment configuration:');
console.log('N8N_BASE_URL:', process.env.N8N_BASE_URL);
console.log('N8N_API_KEY configured:', !!process.env.N8N_API_KEY);
console.log('PROXY_API_KEY configured:', !!process.env.PROXY_API_KEY);

const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://localhost:3000',
    'http://localhost:3002',
    'https://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-N8N-API-KEY', 'X-Requested-With', 'X-Proxy-API-Key']
}));
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/unified-workflows', unifiedWorkflowsRouter);
app.use('/api/workflows', workflowRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Unified Workflows API: http://localhost:${port}/api/unified-workflows`);
  
  // Initialize template data
  try {
    await initializeTemplateData();
    console.log('Template data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize template data:', error);
  }
});

export default app;