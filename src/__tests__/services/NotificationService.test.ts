import { NotificationService } from '../../services/NotificationService';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

// Mock window.Notification
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted' as NotificationPermission),
};

Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    onclick: null,
    onclose: null,
    onerror: null,
    onshow: null,
  })),
  configurable: true,
});

Object.defineProperty(window.Notification, 'permission', {
  value: mockNotification.permission,
  configurable: true,
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: mockNotification.requestPermission,
  configurable: true,
});

// Mock WebSocket constructor
Object.defineProperty(window, 'WebSocket', {
  value: jest.fn().mockImplementation(() => mockWebSocket),
  configurable: true,
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
    mockWebSocket.send.mockClear();
    mockWebSocket.close.mockClear();
    mockWebSocket.addEventListener.mockClear();
    mockWebSocket.removeEventListener.mockClear();
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Initialization', () => {
    it('initializes with default configuration', () => {
      expect(service).toBeInstanceOf(NotificationService);
      expect(service.isConnected()).toBe(false);
    });

    it('accepts custom configuration', () => {
      const customConfig = {
        apiUrl: 'https://custom-api.com',
        wsUrl: 'wss://custom-ws.com',
        enableBrowserNotifications: false,
        retryAttempts: 5,
      };

      const customService = new NotificationService(customConfig);
      expect(customService).toBeInstanceOf(NotificationService);
    });
  });

  describe('Browser Notification Permissions', () => {
    it('requests notification permission successfully', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');

      const permission = await service.requestNotificationPermission();

      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(permission).toBe('granted');
    });

    it('handles denied notification permission', async () => {
      mockNotification.requestPermission.mockResolvedValue('denied');

      const permission = await service.requestNotificationPermission();

      expect(permission).toBe('denied');
    });

    it('checks current notification permission', () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(service.hasNotificationPermission()).toBe(true);

      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(service.hasNotificationPermission()).toBe(false);
    });
  });

  describe('WebSocket Connection', () => {
    it('establishes WebSocket connection', async () => {
      const mockOnOpen = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          mockOnOpen.mockImplementation(callback);
          // Simulate immediate connection
          setTimeout(() => callback(new Event('open')), 0);
        }
      });

      await service.connect('user-123');

      expect(window.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/user-123')
      );
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('handles connection errors', async () => {
      const mockOnError = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'error') {
          mockOnError.mockImplementation(callback);
          setTimeout(() => callback(new Event('error')), 0);
        }
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.connect('user-123')).rejects.toThrow('WebSocket connection failed');

      consoleSpy.mockRestore();
    });

    it('automatically reconnects on connection loss', async () => {
      let onCloseCallback: ((event: CloseEvent) => void) | null = null;

      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(new Event('open')), 0);
        } else if (event === 'close') {
          onCloseCallback = callback;
        }
      });

      await service.connect('user-123');

      // Simulate connection loss
      if (onCloseCallback) {
        onCloseCallback(new CloseEvent('close', { wasClean: false, code: 1006 }));
      }

      // Should attempt to reconnect
      expect(window.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('disconnects WebSocket cleanly', async () => {
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(new Event('open')), 0);
        }
      });

      await service.connect('user-123');
      service.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('Notification Handling', () => {
    beforeEach(async () => {
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(new Event('open')), 0);
        }
      });
      await service.connect('user-123');
    });

    it('processes incoming workflow notifications', () => {
      const mockNotificationData = {
        id: 'notif-123',
        type: 'workflow_success',
        title: 'Workflow Completed Successfully',
        message: 'Invoice Processing workflow completed processing 15 invoices',
        workflowId: 'invoice-processing-001',
        timestamp: new Date().toISOString(),
        priority: 'high',
        data: {
          executionId: 'exec-456',
          itemsProcessed: 15,
          timeTaken: 45,
        }
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const mockMessageEvent = {
        data: JSON.stringify(mockNotificationData)
      };

      const onNotificationSpy = jest.fn();
      service.onNotification(onNotificationSpy);

      if (messageHandler) {
        messageHandler(mockMessageEvent as MessageEvent);
      }

      expect(onNotificationSpy).toHaveBeenCalledWith(mockNotificationData);
    });

    it('displays browser notifications for high priority alerts', () => {
      const mockNotificationData = {
        id: 'notif-124',
        type: 'workflow_error',
        title: 'Workflow Failed',
        message: 'Email Campaign workflow encountered an error',
        priority: 'high',
        timestamp: new Date().toISOString(),
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const mockMessageEvent = {
        data: JSON.stringify(mockNotificationData)
      };

      if (messageHandler) {
        messageHandler(mockMessageEvent as MessageEvent);
      }

      expect(window.Notification).toHaveBeenCalledWith(
        'Workflow Failed',
        expect.objectContaining({
          body: 'Email Campaign workflow encountered an error',
          icon: expect.any(String),
          tag: 'notif-124',
        })
      );
    });

    it('filters notifications by type and priority', () => {
      const filters = {
        types: ['workflow_success', 'workflow_error'],
        minPriority: 'medium',
        workflowIds: ['invoice-processing-001'],
      };

      service.setNotificationFilters(filters);

      const lowPriorityNotification = {
        id: 'notif-125',
        type: 'workflow_info',
        title: 'Info Update',
        message: 'Workflow info updated',
        priority: 'low',
        timestamp: new Date().toISOString(),
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const onNotificationSpy = jest.fn();
      service.onNotification(onNotificationSpy);

      if (messageHandler) {
        messageHandler({
          data: JSON.stringify(lowPriorityNotification)
        } as MessageEvent);
      }

      // Should be filtered out due to low priority and wrong type
      expect(onNotificationSpy).not.toHaveBeenCalled();
    });

    it('handles malformed notification data', () => {
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const mockMessageEvent = {
        data: 'invalid json'
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onNotificationSpy = jest.fn();
      service.onNotification(onNotificationSpy);

      if (messageHandler) {
        messageHandler(mockMessageEvent as MessageEvent);
      }

      expect(onNotificationSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse notification data:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('REST API Notifications', () => {
    it('fetches notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'workflow_success',
          title: 'Success',
          message: 'Workflow completed',
          timestamp: '2024-01-01T12:00:00Z',
          read: false,
        },
        {
          id: 'notif-2',
          type: 'workflow_error',
          title: 'Error',
          message: 'Workflow failed',
          timestamp: '2024-01-01T11:00:00Z',
          read: true,
        }
      ];

      mockedApi.get.mockResolvedValue({
        data: { notifications: mockNotifications, total: 2 },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.getNotificationHistory();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/notifications', {
        params: { page: 1, limit: 50 }
      });
      expect(result.notifications).toEqual(mockNotifications);
      expect(result.total).toBe(2);
    });

    it('marks notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2'];

      mockedApi.patch.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.markAsRead(notificationIds);

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/notifications/read', {
        notificationIds
      });
    });

    it('deletes notifications', async () => {
      const notificationIds = ['notif-1'];

      mockedApi.delete.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.deleteNotifications(notificationIds);

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/notifications', {
        data: { notificationIds }
      });
    });

    it('gets unread notification count', async () => {
      mockedApi.get.mockResolvedValue({
        data: { count: 5 },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const count = await service.getUnreadCount();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/notifications/unread-count');
      expect(count).toBe(5);
    });
  });

  describe('Workflow-Specific Notifications', () => {
    it('subscribes to workflow execution updates', async () => {
      const workflowId = 'invoice-processing-001';
      
      await service.subscribeToWorkflow(workflowId);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        workflowId,
        events: ['execution_start', 'execution_success', 'execution_error', 'execution_progress']
      }));
    });

    it('unsubscribes from workflow updates', async () => {
      const workflowId = 'invoice-processing-001';
      
      await service.unsubscribeFromWorkflow(workflowId);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        workflowId
      }));
    });

    it('sends workflow execution progress updates', () => {
      const progressData = {
        workflowId: 'email-campaign-002',
        executionId: 'exec-789',
        progress: 65,
        currentStep: 'Sending emails',
        totalSteps: 5,
        completedSteps: 3,
        estimatedTimeRemaining: 120,
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const onProgressSpy = jest.fn();
      service.onWorkflowProgress(onProgressSpy);

      if (messageHandler) {
        messageHandler({
          data: JSON.stringify({
            type: 'execution_progress',
            data: progressData
          })
        } as MessageEvent);
      }

      expect(onProgressSpy).toHaveBeenCalledWith(progressData);
    });
  });

  describe('Custom Notification Templates', () => {
    it('registers custom notification templates', () => {
      const customTemplate = {
        type: 'custom_workflow_complete',
        title: (data: any) => `${data.workflowName} Completed Successfully`,
        message: (data: any) => `Processed ${data.itemCount} items in ${data.duration} seconds`,
        icon: 'success',
        priority: 'medium',
      };

      service.registerTemplate('custom_workflow_complete', customTemplate);

      const templates = service.getRegisteredTemplates();
      expect(templates['custom_workflow_complete']).toEqual(customTemplate);
    });

    it('applies custom templates to notifications', () => {
      const customTemplate = {
        type: 'invoice_batch_complete',
        title: (data: any) => `Invoice Batch #${data.batchId} Complete`,
        message: (data: any) => `Successfully processed ${data.invoiceCount} invoices`,
        icon: 'invoice',
        priority: 'high',
      };

      service.registerTemplate('invoice_batch_complete', customTemplate);

      const notificationData = {
        id: 'notif-126',
        type: 'invoice_batch_complete',
        data: {
          batchId: 'B001',
          invoiceCount: 25,
        },
        timestamp: new Date().toISOString(),
      };

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        ([event]) => event === 'message'
      )?.[1];

      const onNotificationSpy = jest.fn();
      service.onNotification(onNotificationSpy);

      if (messageHandler) {
        messageHandler({
          data: JSON.stringify(notificationData)
        } as MessageEvent);
      }

      expect(onNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invoice Batch #B001 Complete',
          message: 'Successfully processed 25 invoices',
          priority: 'high',
        })
      );
    });
  });

  describe('Notification Analytics', () => {
    it('tracks notification metrics', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          totalSent: 150,
          totalRead: 120,
          totalClicked: 45,
          readRate: 80,
          clickRate: 30,
          topTypes: [
            { type: 'workflow_success', count: 80 },
            { type: 'workflow_error', count: 20 },
          ]
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const metrics = await service.getNotificationMetrics();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/notifications/metrics');
      expect(metrics.readRate).toBe(80);
      expect(metrics.topTypes).toHaveLength(2);
    });

    it('tracks user engagement with notifications', async () => {
      const engagementData = {
        notificationId: 'notif-127',
        action: 'clicked',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
      };

      mockedApi.post.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await service.trackEngagement(engagementData);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/notifications/engagement', engagementData);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles API errors gracefully', async () => {
      mockedApi.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getNotificationHistory()).rejects.toThrow('API Error');
    });

    it('retries failed WebSocket connections', async () => {
      let connectionAttempts = 0;
      
      // Mock WebSocket constructor to fail first two attempts
      (window.WebSocket as jest.Mock).mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts <= 2) {
          throw new Error('Connection failed');
        }
        return mockWebSocket;
      });

      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(new Event('open')), 0);
        }
      });

      await service.connect('user-123');

      expect(connectionAttempts).toBe(3); // Initial + 2 retries
    });

    it('queues notifications when offline', () => {
      // Simulate offline state
      mockWebSocket.readyState = WebSocket.CLOSED;

      const notificationData = {
        type: 'custom_alert',
        title: 'Test Alert',
        message: 'This is a test',
      };

      service.sendNotification(notificationData);

      // Should queue the notification
      const queuedNotifications = service.getQueuedNotifications();
      expect(queuedNotifications).toHaveLength(1);
      expect(queuedNotifications[0]).toMatchObject(notificationData);
    });

    it('sends queued notifications when connection is restored', async () => {
      // Start offline
      mockWebSocket.readyState = WebSocket.CLOSED;

      service.sendNotification({
        type: 'queued_alert',
        title: 'Queued Alert',
        message: 'This was queued',
      });

      // Restore connection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(new Event('open')), 0);
        }
      });

      await service.connect('user-123');

      // Should send queued notifications
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('queued_alert')
      );

      // Queue should be empty
      expect(service.getQueuedNotifications()).toHaveLength(0);
    });
  });
});