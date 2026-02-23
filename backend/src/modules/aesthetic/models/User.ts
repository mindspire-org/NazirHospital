import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, default: 'admin' },
  passwordHash: { type: String, required: true },
  permissions: { type: [String], default: [] },
}, { timestamps: true, collection: 'aesthetic_users' })

export type AestheticUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
  permissions?: string[]
}

export const AestheticUser = models.Aesthetic_User || model('Aesthetic_User', UserSchema)
