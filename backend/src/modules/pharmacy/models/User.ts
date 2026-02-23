import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, default: 'salesman' },
  passwordHash: { type: String, required: true },
}, { timestamps: true })

export type PharmacyUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
}

export const PharmacyUser = models.Pharmacy_User || model('Pharmacy_User', UserSchema)
