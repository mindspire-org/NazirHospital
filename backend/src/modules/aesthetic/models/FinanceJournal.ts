import { Schema, model, models } from 'mongoose'

const JournalLineSchema = new Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  tags: { type: Schema.Types.Mixed },
}, { _id: false })

const JournalSchema = new Schema({
  dateIso: { type: String, required: true },
  refType: { type: String },
  refId: { type: String },
  memo: { type: String },
  lines: { type: [JournalLineSchema], default: [] },
}, { timestamps: true, collection: 'aesthetic_finance_journals' })

export type JournalLine = {
  account: string
  debit?: number
  credit?: number
  tags?: any
}

export type JournalDoc = {
  _id: string
  dateIso: string
  refType?: string
  refId?: string
  memo?: string
  lines: JournalLine[]
}

export const AestheticFinanceJournal = models.Aesthetic_Finance_Journal || model('Aesthetic_Finance_Journal', JournalSchema)
