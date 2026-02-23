import { Schema, model, models } from 'mongoose'

const FbrSettingsSchema = new Schema({
  hospitalId: { type: String, index: true },
  branchCode: { type: String, default: '' },
  isEnabled: { type: Boolean, default: false },
  environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  ntn: { type: String, default: '' },
  strn: { type: String, default: '' },
  posId: { type: String, default: '' },
  sandboxPosId: { type: String, default: '' },
  sandboxCode: { type: String, default: '' },
  productionPosId: { type: String, default: '' },
  productionCode: { type: String, default: '' },
  apiTokenEncrypted: { type: String, default: '' },
  businessName: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'HSP' },
  applyModules: { type: [String], default: ['OPD','PHARMACY','LAB','IPD','DIAGNOSTIC','AESTHETIC'] },
}, { timestamps: true, collection: 'fbr_settings' })

FbrSettingsSchema.index({ hospitalId: 1, branchCode: 1 }, { unique: false })

export type FbrSettingsDoc = {
  _id: string
  hospitalId?: string
  branchCode?: string
  isEnabled: boolean
  environment: 'sandbox' | 'production'
  ntn?: string
  strn?: string
  posId?: string
  sandboxPosId?: string
  sandboxCode?: string
  productionPosId?: string
  productionCode?: string
  apiTokenEncrypted?: string
  businessName?: string
  invoicePrefix?: string
  applyModules: string[]
}

export const FbrSettings = models.Fbr_Settings || model('Fbr_Settings', FbrSettingsSchema)
