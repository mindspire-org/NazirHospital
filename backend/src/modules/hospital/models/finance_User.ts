import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, required: true, lowercase: true, default: 'admin' },
  passwordHash: { type: String, required: true },
}, { timestamps: true })

export type FinanceUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
}

export const FinanceUser = models.finance_User || model('finance_User', UserSchema)
