import { Schema, model, models } from 'mongoose'

const BedSchema = new Schema({
  label: { type: String, required: true },
  floorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Floor', required: true, index: true },
  locationType: { type: String, enum: ['room','ward'], required: true },
  locationId: { type: Schema.Types.ObjectId, required: true, index: true }, // ref Room or Ward depending on locationType
  status: { type: String, enum: ['available','occupied'], default: 'available', index: true },
  charges: { type: Number },
  category: { type: String },
  occupiedByEncounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
}, { timestamps: true })

BedSchema.index({ locationType: 1, locationId: 1, label: 1 }, { unique: false })

export type HospitalBedDoc = {
  _id: string
  label: string
  floorId: string
  locationType: 'room'|'ward'
  locationId: string
  status: 'available'|'occupied'
  charges?: number
  category?: string
  occupiedByEncounterId?: string
}

export const HospitalBed = models.Hospital_Bed || model('Hospital_Bed', BedSchema)
