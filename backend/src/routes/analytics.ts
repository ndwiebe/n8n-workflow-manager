import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Mock analytics data
const generateAnalyticsData = () => {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      activeWorkflows: Math.floor(Math.random() * 50) + 20,
      newUsers: Math.floor(Math.random() * 10) + 1,
      workflowExecutions: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 0.05, // 0-5% error rate
      avgResponseTime: Math.floor(Math.random() * 200) + 100 // 100-300ms
    };
  });

  return {
    overview: {
      totalUsers: 156,
      activeUsers: 89,
      totalWorkflows: 234,
      activeWorkflows: 167,
      totalExecutions: 45678,
      successRate: 96.8,
      avgResponseTime: 185
    },
    dailyStats: last30Days,
    topWorkflows: [
      {
        id: 'slack-digest',
        name: 'Slack Daily Digest',
        executions: 1234,
        successRate: 98.5,
        avgResponseTime: 150
      },
      {
        id: 'invoice-processor',
        name: 'Invoice Processing',
        executions: 987,
        successRate: 95.2,
        avgResponseTime: 320
      },
      {
        id: 'email-marketing',
        name: 'Email Marketing',
        executions: 756,
        successRate: 97.8,
        avgResponseTime: 180
      }
    ],
    categoryStats: {
      'Communication': 45,
      'Finance': 32,
      'Marketing': 28,
      'Analytics': 15,
      'Operations': 12
    },
    userActivity: {
      dailyActiveUsers: 67,
      weeklyActiveUsers: 89,
      monthlyActiveUsers: 134,
      averageSessionTime: 1250 // seconds
    }
  };
};

/**
 * GET /api/analytics/overview
 * Get analytics overview (admin only)
 */
router.get('/overview', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const analytics = generateAnalyticsData();
    
    res.json({
      success: true,
      data: {
        overview: analytics.overview,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics overview'
    });
  }
});

/**
 * GET /api/analytics/daily
 * Get daily analytics data (admin only)
 */
router.get('/daily', authenticate, requireAdmin, [
  query('days').optional().isInt({ min: 1, max: 90 }),
  query('metric').optional().isIn(['activeWorkflows', 'newUsers', 'workflowExecutions', 'errorRate', 'avgResponseTime'])
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

    const { days = 30, metric } = req.query;
    const analytics = generateAnalyticsData();
    
    let dailyStats = analytics.dailyStats.slice(-Number(days));
    
    // Filter by specific metric if requested
    if (metric) {
      dailyStats = dailyStats.map(day => ({
        date: day.date,
        [metric as string]: day[metric as keyof typeof day]
      }));
    }

    res.json({
      success: true,
      data: {
        dailyStats,
        period: {
          days: Number(days),
          metric: metric || 'all'
        }
      }
    });
  } catch (error) {
    logger.error('Get daily analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily analytics'
    });
  }
});

/**
 * GET /api/analytics/workflows
 * Get workflow analytics (admin only)
 */
router.get('/workflows', authenticate, requireAdmin, [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy').optional().isIn(['executions', 'successRate', 'avgResponseTime']),
  query('order').optional().isIn(['asc', 'desc'])
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

    const { limit = 10, sortBy = 'executions', order = 'desc' } = req.query;
    const analytics = generateAnalyticsData();
    
    let workflows = [...analytics.topWorkflows];
    
    // Sort workflows
    workflows.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Apply limit
    workflows = workflows.slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        workflows,
        categoryStats: analytics.categoryStats,
        sorting: {
          sortBy,
          order,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get workflow analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow analytics'
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user analytics (admin only)
 */
router.get('/users', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const analytics = generateAnalyticsData();
    
    res.json({
      success: true,
      data: {
        userActivity: analytics.userActivity,
        growth: {
          dailyGrowthRate: 2.3,
          weeklyGrowthRate: 8.7,
          monthlyGrowthRate: 15.2
        },
        engagement: {
          averageWorkflowsPerUser: 2.8,
          averageExecutionsPerUser: 523,
          topUserSegments: [
            { segment: 'Power Users', count: 23, percentage: 14.7 },
            { segment: 'Regular Users', count: 89, percentage: 57.1 },
            { segment: 'New Users', count: 44, percentage: 28.2 }
          ]
        }
      }
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user analytics'
    });
  }
});

/**
 * GET /api/analytics/performance
 * Get performance analytics (admin only)
 */
router.get('/performance', authenticate, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const analytics = generateAnalyticsData();
    
    res.json({
      success: true,
      data: {
        systemPerformance: {
          avgResponseTime: analytics.overview.avgResponseTime,
          successRate: analytics.overview.successRate,
          errorRate: 100 - analytics.overview.successRate,
          throughput: 1250 // requests per minute
        },
        resourceUsage: {
          cpuUsage: 45.8,
          memoryUsage: 62.3,
          diskUsage: 34.7,
          networkUsage: 23.1
        },
        alerts: [
          {
            type: 'warning',
            message: 'Memory usage above 60%',
            timestamp: new Date().toISOString()
          }
        ]
      }
    });
  } catch (error) {
    logger.error('Get performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance analytics'
    });
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data (admin only)
 */
router.get('/export', authenticate, requireAdmin, [
  query('format').optional().isIn(['json', 'csv']),
  query('type').optional().isIn(['overview', 'daily', 'workflows', 'users'])
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

    const { format = 'json', type = 'overview' } = req.query;
    const analytics = generateAnalyticsData();
    
    let data;
    switch (type) {
      case 'daily':
        data = analytics.dailyStats;
        break;
      case 'workflows':
        data = analytics.topWorkflows;
        break;
      case 'users':
        data = analytics.userActivity;
        break;
      default:
        data = analytics.overview;
    }

    if (format === 'csv') {
      // Simple CSV conversion (in production, use a proper CSV library)
      const csvData = JSON.stringify(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data,
        exportedAt: new Date().toISOString(),
        type,
        format
      });
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

export default router;