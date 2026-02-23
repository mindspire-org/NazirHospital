import { Schema, model, models } from 'mongoose'
import { IFBRInvoiceRecord, FBRInvoiceStatus } from '../types/fbrTypes'

const FBRInvoiceSchema = new Schema({
    invoiceId: { type: String, required: true, index: true },
    invoiceType: {
        type: String,
        required: true,
        enum: ['pharmacy', 'lab', 'hospital', 'diagnostic'],
        index: true
    },
    posId: { type: String, required: true },
    invoiceNumber: { type: String, required: true, index: true },
    fbrInvoiceNumber: { type: String },
    usin: { type: String, required: true, unique: true, index: true },
    trackingNumber: { type: String },
    qrCode: { type: String },
    fiscalizationDate: { type: Date },
    status: {
        type: String,
        required: true,
        enum: Object.values(FBRInvoiceStatus),
        default: FBRInvoiceStatus.PENDING,
        index: true
    },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    rawRequest: { type: Schema.Types.Mixed },
    rawResponse: { type: Schema.Types.Mixed }
}, {
    timestamps: true,
    collection: 'fbr_invoices'
})

// Index for querying failed invoices
FBRInvoiceSchema.index({ status: 1, createdAt: -1 })
FBRInvoiceSchema.index({ invoiceType: 1, status: 1 })

export type FBRInvoiceDoc = IFBRInvoiceRecord

export const FBRInvoice = models.FBRInvoice || model<FBRInvoiceDoc>('FBRInvoice', FBRInvoiceSchema)
