import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { InventoryItem } from '../models/InventoryItem';
import { Purchase } from '../models/Purchase';

export async function getNotifications(req: Request, res: Response) {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = await Notification.countDocuments({ read: false });

    res.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

export async function generateNotifications(req: Request, res: Response) {
  try {
    // Clear old notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

    const notifications: any[] = [];

    // 1. Low Stock Notifications
    const lowStockItems = await InventoryItem.find({
      $expr: { $lte: ['$onHand', '$minStock'] }
    }).limit(50);

    for (const item of lowStockItems) {
      const existing = await Notification.findOne({
        type: 'low_stock',
        'metadata.itemName': item.name,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (!existing) {
        notifications.push({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${item.name} is running low. Current stock: ${item.onHand}, Minimum: ${item.minStock}`,
          severity: item.onHand === 0 ? 'critical' : 'warning',
          metadata: { itemName: item.name, currentStock: item.onHand, minStock: item.minStock },
        });
      }
    }

    // 2. Expiring Soon Notifications
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await InventoryItem.find({
      earliestExpiry: { $lte: thirtyDaysFromNow.toISOString().split('T')[0], $gte: new Date().toISOString().split('T')[0] }
    }).limit(50);

    for (const item of expiringItems) {
      const existing = await Notification.findOne({
        type: 'expiring_soon',
        'metadata.itemName': item.name,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!existing && item.earliestExpiry) {
        const daysUntilExpiry = Math.ceil((new Date(item.earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        notifications.push({
          type: 'expiring_soon',
          title: 'Expiring Soon',
          message: `${item.name} expires in ${daysUntilExpiry} days (${item.earliestExpiry})`,
          severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
          metadata: { itemName: item.name, expiryDate: item.earliestExpiry, daysUntilExpiry },
        });
      }
    }

    // 3. Recent Purchase Notifications
    const recentPurchases = await Purchase.find({
      date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ date: -1 }).limit(10);

    for (const purchase of recentPurchases) {
      const existing = await Notification.findOne({
        type: 'purchase',
        'metadata.purchaseId': purchase._id.toString(),
      });

      if (!existing) {
        const totalAmount = (purchase.lines || []).reduce((sum: number, line: any) => 
          sum + (line.buyPerPack || 0) * (line.packs || 0), 0
        );
        
        notifications.push({
          type: 'purchase',
          title: 'New Purchase Recorded',
          message: `Purchase invoice ${purchase.invoice} - Total: PKR ${totalAmount.toFixed(2)}`,
          severity: 'info',
          metadata: { purchaseId: purchase._id.toString(), invoice: purchase.invoice, totalAmount },
        });
      }
    }

    // 4. Daily Closing Balance (if end of day)
    const now = new Date();
    const isEndOfDay = now.getHours() >= 22; // After 10 PM

    if (isEndOfDay) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const existing = await Notification.findOne({
        type: 'closing_balance',
        createdAt: { $gte: todayStart }
      });

      if (!existing) {
        notifications.push({
          type: 'closing_balance',
          title: 'Daily Closing Reminder',
          message: 'Don\'t forget to review today\'s closing balance sheet and reconcile accounts.',
          severity: 'info',
          metadata: { date: now.toISOString().split('T')[0] },
        });
      }
    }

    // Insert all new notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ 
      success: true, 
      generated: notifications.length,
      message: `Generated ${notifications.length} new notifications`
    });
  } catch (error) {
    console.error('Error generating notifications:', error);
    res.status(500).json({ error: 'Failed to generate notifications' });
  }
}
