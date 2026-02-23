import { Schema, model, models } from 'mongoose'

const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  opdBaseFee: { type: Number, required: true, min: 0 },
  opdFollowupFee: { type: Number },
  followupWindowDays: { type: Number },
  doctorPrices: [{
    doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
    price: { type: Number },
  }],
}, { timestamps: true })

export type HospitalDepartmentDoc = {
  _id: string
  name: string
  description?: string
  opdBaseFee: number
  opdFollowupFee?: number
  followupWindowDays?: number
  doctorPrices?: Array<{ doctorId: string; price: number }>
}

export const HospitalDepartment = models.Hospital_Department || model('Hospital_Department', DepartmentSchema)
