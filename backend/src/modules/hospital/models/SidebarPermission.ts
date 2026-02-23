import { Schema, model, models } from 'mongoose'

const PermissionSchema = new Schema({
  path: { type: String, required: true },
  label: { type: String, required: true },
  visible: { type: Boolean, default: true },
  order: { type: Number, required: true },
}, { _id: false })

const SidebarPermissionSchema = new Schema({
  role: { type: String, required: true, index: true },
  permissions: { type: [PermissionSchema], default: [] },
  updatedBy: { type: String },
}, { timestamps: true })

export type HospitalSidebarPermissionDoc = {
  _id: string
  role: string
  permissions: Array<{ path: string; label: string; visible: boolean; order: number }>
  updatedBy?: string
}

export const HospitalSidebarPermission = models.Hospital_SidebarPermission || model('Hospital_SidebarPermission', SidebarPermissionSchema)
