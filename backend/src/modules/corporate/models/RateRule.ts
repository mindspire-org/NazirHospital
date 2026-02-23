import { Schema, model, models } from 'mongoose'

const CorporateRateRuleSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company', required: true, index: true },
  scope: { type: String, enum: ['OPD','LAB','DIAG','IPD'], required: true, index: true },
  ruleType: { type: String, enum: ['default','department','doctor','test','testGroup','procedure','service','bedCategory'], required: true },
  refId: { type: String }, // e.g., departmentId/doctorId/testId/group key
  visitType: { type: String, enum: ['new','followup', 'any'], default: 'any' }, // OPD-only hint
  mode: { type: String, enum: ['fixedPrice','percentDiscount','fixedDiscount'], required: true },
  value: { type: Number, required: true },
  priority: { type: Number, default: 100 },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type CorporateRateRuleDoc = {
  _id: string
  companyId: string
  scope: 'OPD'|'LAB'|'DIAG'|'IPD'
  ruleType: 'default'|'department'|'doctor'|'test'|'testGroup'|'procedure'|'service'|'bedCategory'
  refId?: string
  visitType?: 'new'|'followup'|'any'
  mode: 'fixedPrice'|'percentDiscount'|'fixedDiscount'
  value: number
  priority?: number
  effectiveFrom?: Date
  effectiveTo?: Date
  active: boolean
}

export const CorporateRateRule = models.Corporate_RateRule || model('Corporate_RateRule', CorporateRateRuleSchema)
