import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema({
  type: {
    type: String,
    enum: ['low_stock', 'expiring_soon', 'purchase', 'finance', 'closing_balance', 'alert'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'success'],
    default: 'info',
  },
  read: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'aesthetic_notifications' });

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ type: 1 });

export default model('aesthetic_Notification', NotificationSchema);
