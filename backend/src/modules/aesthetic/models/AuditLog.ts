import { Schema, model, models } from 'mongoose'

const AuditLogSchema = new Schema({
  actor: { type: String, default: 'system' },
  action: { type: String, required: true },
  label: { type: String },
  method: { type: String },
  path: { type: String },
  at: { type: String, required: true }, // ISO datetime
  detail: { type: String },
}, { timestamps: true, collection: 'aesthetic_auditlogs' })

export type AuditLogDoc = {
  _id: string
  actor: string
  action: string
  label?: string
  method?: string
  path?: string
  at: string
  detail?: string
}

export const AuditLog = models.Aesthetic_AuditLog || model('Aesthetic_AuditLog', AuditLogSchema)
