import { Schema, model, models } from 'mongoose'

const AuditLogSchema = new Schema({
  actor: { type: String, default: 'system' },
  action: { type: String, required: true },
  label: { type: String },
  method: { type: String },
  path: { type: String },
  at: { type: String, required: true },
  detail: { type: String },
}, { timestamps: true })

export type FinanceAuditLogDoc = {
  _id: string
  actor: string
  action: string
  label?: string
  method?: string
  path?: string
  at: string
  detail?: string
}

export const FinanceAuditLog = models.Hospital_Finance_AuditLog || model('Hospital_Finance_AuditLog', AuditLogSchema)
