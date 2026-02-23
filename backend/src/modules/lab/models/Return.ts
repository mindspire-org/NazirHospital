import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  itemId: { type: String },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, default: 0 },
})

const ReturnSchema = new Schema({
  type: { type: String, enum: ['Customer','Supplier'], required: true },
  datetime: { type: String, required: true }, // ISO
  reference: { type: String, required: true }, // billNo or invoice
  party: { type: String, required: true }, // customer name or supplier name
  note: { type: String, default: '' },
  items: { type: Number, required: true },
  total: { type: Number, required: true },
  lines: { type: [LineSchema], default: [] },
}, { timestamps: true })

export type LabReturnDoc = {
  _id: string
  type: 'Customer'|'Supplier'
  datetime: string
  reference: string
  party: string
  note?: string
  items: number
  total: number
  lines: { itemId?:string; name:string; qty:number; amount:number }[]
}

export const LabReturn = (models as any).Lab_Return || model('Lab_Return', ReturnSchema)
