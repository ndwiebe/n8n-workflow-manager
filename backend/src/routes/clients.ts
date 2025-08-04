import { Router } from 'express';
import { query, param, validationResult } from 'express-validator';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Mock client data
const clients = [
  {
    id: 'client-1',
    name: 'Demo User',
    email: 'demo@example.com',
    company: 'Demo Company',
    role: 'user',
    status: 'active',
    activeWorkflows: 3,
    totalWorkflows: 5,
    lastLogin: new Date('2024-07-14T10:30:00Z'),
    createdAt: new Date('2024-01-15T09:00:00Z'),
    subscription: {
      plan: 'Professional',
      status: 'active',
      nextBilling: new Date('2024-08-15T00:00:00Z')
    }
  },
  {
    id: 'client-2',
    name: 'Jane Smith',
    email: 'jane@techcorp.com',
    company: 'Tech Corp',
    role: 'user',
    status: 'active',
    activeWorkflows: 7,
    totalWorkflows: 10,
    lastLogin: new Date('2024-07-13T14:20:00Z'),
    createdAt: new Date('2024-02-01T10:15:00Z'),
    subscription: {
      plan: 'Enterprise',
      status: 'active',
      nextBilling: new Date('2024-08-01T00:00:00Z')
    }
  },
  {
    id: 'client-3',
    name: 'Bob Johnson',
    email: 'bob@startup.io',
    company: 'Startup Inc',
    role: 'user',
    status: 'inactive',
    activeWorkflows: 0,
    totalWorkflows: 2,
    lastLogin: new Date('2024-06-20T16:45:00Z'),
    createdAt: new Date('2024-03-10T11:30:00Z'),
    subscription: {
      plan: 'Basic',
      status: 'cancelled',
      nextBilling: null
    }
  }
];

/**
 * GET /api/clients
 * Get all clients (admin only)
 */
router.get('/', authenticate, requireAdmin, [
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('plan').optional().isIn(['Basic', 'Professional', 'Enterprise']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('search').optional().isString()
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, plan, limit = 20, offset = 0, search } = req.query;
    let filteredClients = [...clients];

    // Apply filters
    if (status) {
      filteredClients = filteredClients.filter(client => client.status === status);
    }

    if (plan) {
      filteredClients = filteredClients.filter(client => client.subscription.plan === plan);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredClients = filteredClients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.company.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const total = filteredClients.length;
    const paginatedClients = filteredClients.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        clients: paginatedClients,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get clients'
    });
  }
});

/**
 * GET /api/clients/:clientId
 * Get specific client details (admin only)
 */
router.get('/:clientId', authenticate, requireAdmin, [
  param('clientId').isString().notEmpty()
], (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clientId } = req.params;
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: {
        client
      }
    });
  } catch (error) {
    logger.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client'
    });
  }
});

/**
 * GET /api/clients/stats
 * Get client statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const inactiveClients = clients.filter(c => c.status === 'inactive').length;
    
    const subscriptionStats = clients.reduce((acc, client) => {
      acc[client.subscription.plan] = (acc[client.subscription.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalWorkflows = clients.reduce((sum, client) => sum + client.totalWorkflows, 0);
    const totalActiveWorkflows = clients.reduce((sum, client) => sum + client.activeWorkflows, 0);

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        inactiveClients,
        subscriptionStats,
        totalWorkflows,
        totalActiveWorkflows,
        averageWorkflowsPerClient: totalClients > 0 ? Math.round(totalWorkflows / totalClients) : 0
      }
    });
  } catch (error) {
    logger.error('Get client stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client statistics'
    });
  }
});

export default router;