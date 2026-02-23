import { Schema, model, models } from 'mongoose'

const ProcedureCatalogSchema = new Schema({
  name: { type: String, required: true, index: true },
  basePrice: { type: Number, default: 0 },
  defaultDoctorId: { type: String },
  defaultConsentTemplateId: { type: String },
  package: {
    sessionsCount: { type: Number, default: 1 },
    intervalDays: { type: Number, default: 0 },
  },
  active: { type: Boolean, default: true },
  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'aesthetic_procedure_catalog' })

ProcedureCatalogSchema.index({ createdAt: -1 })
ProcedureCatalogSchema.index({ name: 'text' })

export type ProcedureCatalogDoc = {
  _id: string
  name: string
  basePrice?: number
  defaultDoctorId?: string
  defaultConsentTemplateId?: string
  package?: { sessionsCount?: number; intervalDays?: number }
  active?: boolean
  createdAtIso?: string
}

export const ProcedureCatalog = models.Aesthetic_ProcedureCatalog || model('Aesthetic_ProcedureCatalog', ProcedureCatalogSchema)
