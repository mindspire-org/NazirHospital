import { Schema, model, models } from 'mongoose'

const SidebarPermissionSchema = new Schema({
  role: { type: String, required: true, unique: true },
  permissions: [{
    path: { type: String, required: true },
    label: { type: String, required: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  }],
  updatedBy: { type: String },
}, { timestamps: true })

export type SidebarPermissionDoc = {
  _id: string
  role: string
  permissions: {
    path: string
    label: string
    visible: boolean
    order: number
  }[]
  updatedBy?: string
}

export const SidebarPermission = models.Finance_SidebarPermission || model('Finance_SidebarPermission', SidebarPermissionSchema)
