import { Schema, model, models } from 'mongoose'

const AuditLogSchema = new Schema({
  action: { type: String, required: true },
  subjectType: { type: String },
  subjectId: { type: String },
  message: { type: String },
  data: { type: Schema.Types.Mixed },
  actorId: { type: String },
  actorUsername: { type: String },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true })

export type DiagnosticAuditLogDoc = {
  _id: string
  action: string
  subjectType?: string
  subjectId?: string
  message?: string
  data?: any
  actorId?: string
  actorUsername?: string
  ip?: string
  userAgent?: string
}

export const DiagnosticAuditLog = models.Diagnostic_AuditLog || model('Diagnostic_AuditLog', AuditLogSchema)
