import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  diagnosticName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  department: { type: String, default: '' },
  consultantName: { type: String, default: '' },
  consultantDegrees: { type: String, default: '' },
  consultantTitle: { type: String, default: '' },
  consultants: {
    type: [{ name: String, degrees: String, title: String }],
    default: [],
    validate: [(arr: any[]) => !arr || arr.length <= 3, 'Maximum 3 consultants allowed'],
  },
  templateMappings: {
    type: [{ testId: String, testName: String, templateKey: String }],
    default: [],
  },
}, { timestamps: true })

export type DiagnosticSettingsDoc = {
  _id: string
  diagnosticName: string
  phone: string
  address: string
  email: string
  reportFooter: string
  logoDataUrl?: string
  department?: string
  consultantName?: string
  consultantDegrees?: string
  consultantTitle?: string
  consultants?: Array<{ name?: string; degrees?: string; title?: string }>
  templateMappings?: Array<{ testId: string; testName?: string; templateKey: string }>
}

export const DiagnosticSettings = models.Diagnostic_Settings || model('Diagnostic_Settings', SettingsSchema)
