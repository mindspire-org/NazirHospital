import { Schema, model, models } from 'mongoose'

const StaffSchema = new Schema({
  name: { type: String, required: true },
  position: { type: String },
  phone: { type: String },
  joinDate: { type: String },
  address: { type: String },
  status: { type: String, enum: ['Active','Inactive'], default: 'Active' },
  salary: { type: Number, default: 0 },
  shiftId: { type: String },
}, { timestamps: true })

export type StaffDoc = {
  _id: string
  name: string
  position?: string
  phone?: string
  joinDate?: string
  address?: string
  status: 'Active'|'Inactive'
  salary?: number
  shiftId?: string
}

export const Staff = models.Pharmacy_Staff || model('Pharmacy_Staff', StaffSchema)
