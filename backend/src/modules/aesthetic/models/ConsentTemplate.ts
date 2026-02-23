import { Schema, model, models } from 'mongoose'

const ConsentTemplateSchema = new Schema({
  name: { type: String, required: true },
  body: { type: String, required: true }, // HTML/Markdown/Text
  version: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  fields: { type: Array, default: [] }, // optional structured fields metadata
  createdAtIso: { type: String, default: () => new Date().toISOString() },
  createdBy: { type: String },
}, { timestamps: true, collection: 'aesthetic_consent_templates' })

export type ConsentTemplateDoc = {
  _id: string
  name: string
  body: string
  version?: number
  active?: boolean
  fields?: any[]
  createdAtIso?: string
  createdBy?: string
}

export const ConsentTemplate = models.Aesthetic_ConsentTemplate || model('Aesthetic_ConsentTemplate', ConsentTemplateSchema)
