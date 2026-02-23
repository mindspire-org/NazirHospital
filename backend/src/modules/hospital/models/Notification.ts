import { Schema, model, models } from 'mongoose'

const NotificationSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', index: true, required: true },
  type: { type: String, default: 'info' },
  message: { type: String, required: true },
  payload: { type: Schema.Types.Mixed },
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: true } })

NotificationSchema.index({ doctorId: 1, createdAt: -1 })

export type HospitalNotificationDoc = {
  _id: string
  doctorId: string
  type?: string
  message: string
  payload?: any
  read?: boolean
  createdAt: Date
  updatedAt: Date
}

export const HospitalNotification = models.Hospital_Notification || model('Hospital_Notification', NotificationSchema)
