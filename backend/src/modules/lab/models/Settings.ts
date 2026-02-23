import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  labName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  department: { type: String, default: '' },
  reportTemplate: { type: String, default: 'classic' },
  slipTemplate: { type: String, default: 'thermal' },
  consultantName: { type: String, default: '' },
  consultantDegrees: { type: String, default: '' },
  consultantTitle: { type: String, default: '' },
  consultants: {
    type: [{ name: String, degrees: String, title: String }],
    default: [],
    validate: [(arr: any[]) => !arr || arr.length <= 3, 'Maximum 3 consultants allowed'],
  },
}, { timestamps: true })

export type LabSettingsDoc = {
  _id: string
  labName: string
  phone: string
  address: string
  email: string
  reportFooter: string
  logoDataUrl?: string
  department?: string
  reportTemplate?: 'classic'|'tealGradient'|'modern'
  slipTemplate?: 'thermal'|'a4Bill'
  consultantName?: string
  consultantDegrees?: string
  consultantTitle?: string
  consultants?: Array<{ name?: string; degrees?: string; title?: string }>
}

export const LabSettings = models.Lab_Settings || model('Lab_Settings', SettingsSchema)
