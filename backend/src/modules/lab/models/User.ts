import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, default: 'admin' },
  passwordHash: { type: String, required: true },
  shiftId: { type: Schema.Types.ObjectId, ref: 'Lab_Shift', index: true },
  shiftRestricted: { type: Boolean, default: false },
}, { timestamps: true })

export type LabUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
  shiftId?: string
  shiftRestricted?: boolean
}

export const LabUser = models.Lab_User || model('Lab_User', UserSchema)
