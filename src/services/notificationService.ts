interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface BusinessAlert {
  type: 'workflow_failure' | 'revenue_milestone' | 'system_status' | 'customer_action' | 'inventory_low';
  severity: 'low' | 'medium' | 'high' | 'critical';
  workflowId?: string;
  workflowName?: string;
  message: string;
  data?: any;
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permissionGranted: boolean = false;
  private subscriptionEndpoint: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        await this.checkPermission();
        await this.getSubscription();
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    // Permission is default, request it
    const permission = await Notification.requestPermission();
    this.permissionGranted = permission === 'granted';
    return this.permissionGranted;
  }

  async subscribeToPushNotifications(): Promise<boolean> {
    if (!this.registration || !this.permissionGranted) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
        )
      });

      this.subscriptionEndpoint = subscription.endpoint;
      
      // Send subscription to your backend
      await this.sendSubscriptionToServer(subscription);
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        this.subscriptionEndpoint = subscription.endpoint;
      }
      return subscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    const subscription = await this.getSubscription();
    if (!subscription) return true;

    try {
      await subscription.unsubscribe();
      await this.removeSubscriptionFromServer();
      this.subscriptionEndpoint = null;
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  async showLocalNotification(config: NotificationConfig): Promise<void> {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return;
    }

    if (!this.registration) {
      // Fallback to browser notification
      new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/logo192.png',
        badge: config.badge || '/favicon.ico',
        data: config.data,
        tag: config.tag,
        requireInteraction: config.requireInteraction,
        silent: config.silent
      });
      return;
    }

    try {
      await this.registration.showNotification(config.title, {
        body: config.body,
        icon: config.icon || '/logo192.png',
        badge: config.badge || '/favicon.ico',
        data: config.data,
        actions: config.actions,
        tag: config.tag,
        requireInteraction: config.requireInteraction,
        silent: config.silent,
        vibrate: [100, 50, 100]
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async sendBusinessAlert(alert: BusinessAlert): Promise<void> {
    const config: NotificationConfig = {
      title: this.getAlertTitle(alert),
      body: alert.message,
      icon: this.getAlertIcon(alert.type),
      data: {
        type: 'business_alert',
        alertType: alert.type,
        severity: alert.severity,
        workflowId: alert.workflowId,
        timestamp: new Date().toISOString(),
        ...alert.data
      },
      actions: this.getAlertActions(alert),
      tag: `${alert.type}_${alert.workflowId || 'general'}`,
      requireInteraction: alert.severity === 'critical',
      silent: alert.severity === 'low'
    };

    await this.showLocalNotification(config);
    
    // Also send to server for persistent storage and multi-device sync
    await this.sendAlertToServer(alert);
  }

  private getAlertTitle(alert: BusinessAlert): string {
    const titles = {
      workflow_failure: `⚠️ Workflow Failed: ${alert.workflowName}`,
      revenue_milestone: '🎉 Revenue Milestone Reached!',
      system_status: '🔧 System Status Update',
      customer_action: '👤 Customer Action Required',
      inventory_low: '📦 Low Inventory Alert'
    };
    return titles[alert.type] || 'Business Alert';
  }

  private getAlertIcon(type: BusinessAlert['type']): string {
    const icons = {
      workflow_failure: '/icons/error.png',
      revenue_milestone: '/icons/success.png',
      system_status: '/icons/system.png',
      customer_action: '/icons/customer.png',
      inventory_low: '/icons/inventory.png'
    };
    return icons[type] || '/logo192.png';
  }

  private getAlertActions(alert: BusinessAlert): NotificationAction[] {
    const baseActions: NotificationAction[] = [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ];

    switch (alert.type) {
      case 'workflow_failure':
        return [
          { action: 'fix', title: 'Fix Workflow', icon: '/icons/fix.png' },
          { action: 'retry', title: 'Retry', icon: '/icons/retry.png' },
          ...baseActions
        ];
      case 'customer_action':
        return [
          { action: 'respond', title: 'Respond', icon: '/icons/reply.png' },
          ...baseActions
        ];
      case 'inventory_low':
        return [
          { action: 'reorder', title: 'Reorder', icon: '/icons/cart.png' },
          ...baseActions
        ];
      default:
        return baseActions;
    }
  }

  async scheduleROINotification(milestone: number, timeframe: string): Promise<void> {
    // This would typically be handled by your backend, but we can set up local scheduling
    const config: NotificationConfig = {
      title: '💰 ROI Milestone Alert',
      body: `You've saved $${milestone.toLocaleString()} in ${timeframe} through automation!`,
      icon: '/icons/money.png',
      data: {
        type: 'roi_milestone',
        amount: milestone,
        timeframe,
        timestamp: new Date().toISOString()
      },
      actions: [
        { action: 'view_report', title: 'View Report', icon: '/icons/report.png' },
        { action: 'share', title: 'Share Success', icon: '/icons/share.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ],
      requireInteraction: true
    };

    await this.showLocalNotification(config);
  }

  async sendWorkflowStatusUpdate(workflowId: string, workflowName: string, status: 'success' | 'failure' | 'warning'): Promise<void> {
    const statusEmojis = { success: '✅', failure: '❌', warning: '⚠️' };
    const statusMessages = {
      success: 'completed successfully',
      failure: 'failed to execute',
      warning: 'completed with warnings'
    };

    const alert: BusinessAlert = {
      type: status === 'failure' ? 'workflow_failure' : 'system_status',
      severity: status === 'failure' ? 'high' : status === 'warning' ? 'medium' : 'low',
      workflowId,
      workflowName,
      message: `${workflowName} ${statusMessages[status]}`,
      data: { status }
    };

    await this.sendBusinessAlert(alert);
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: this.subscriptionEndpoint
        })
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  private async sendAlertToServer(alert: BusinessAlert): Promise<void> {
    try {
      await fetch('/api/notifications/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...alert,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to send alert to server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Utility methods for common business scenarios
  async notifyCustomerOnboarding(customerName: string, customerEmail: string): Promise<void> {
    const alert: BusinessAlert = {
      type: 'customer_action',
      severity: 'medium',
      message: `New customer ${customerName} has signed up and needs onboarding`,
      data: { customerName, customerEmail }
    };
    await this.sendBusinessAlert(alert);
  }

  async notifyLowInventory(productName: string, currentStock: number, threshold: number): Promise<void> {
    const alert: BusinessAlert = {
      type: 'inventory_low',
      severity: currentStock === 0 ? 'critical' : 'medium',
      message: `${productName} is ${currentStock === 0 ? 'out of stock' : `low in stock (${currentStock} remaining)`}`,
      data: { productName, currentStock, threshold }
    };
    await this.sendBusinessAlert(alert);
  }

  async notifyRevenueGoal(amount: number, goalAmount: number, percentage: number): Promise<void> {
    if (percentage >= 100) {
      await this.scheduleROINotification(amount, 'this period');
    } else if (percentage >= 75) {
      const alert: BusinessAlert = {
        type: 'revenue_milestone',
        severity: 'low',
        message: `You're ${percentage.toFixed(1)}% of the way to your revenue goal! ($${amount.toLocaleString()} of $${goalAmount.toLocaleString()})`,
        data: { amount, goalAmount, percentage }
      };
      await this.sendBusinessAlert(alert);
    }
  }

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  isSubscribed(): boolean {
    return !!this.subscriptionEndpoint;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
export type { NotificationConfig, BusinessAlert, NotificationAction };