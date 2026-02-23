import { Schema, model, models } from 'mongoose'

const CompanySchema = new Schema({
  name: { type: String, required: true, index: true },
  distributorId: { type: String }, // Supplier/Distributor _id
  distributorName: { type: String },
  status: { type: String, enum: ['Active','Inactive'], default: 'Active' },
}, { timestamps: true, collection: 'pharmacy_companies' })

export type CompanyDoc = {
  _id: string
  name: string
  distributorId?: string
  distributorName?: string
  status: 'Active'|'Inactive'
}

export const Company = (models as any).Pharmacy_Company || model('Pharmacy_Company', CompanySchema)
