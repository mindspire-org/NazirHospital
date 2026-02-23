import { Schema, model, models } from 'mongoose'
import { IFBRConfig, FBREnvironment } from '../types/fbrTypes'

const FBRConfigSchema = new Schema({
    posId: { type: String, required: true },
    facilityName: { type: String, required: true },
    ntn: { type: String, required: true },
    usinPrefix: { type: String, required: true },
    imsServiceUrl: { type: String, required: true, default: 'http://localhost:8524' },
    isEnabled: { type: Boolean, default: false },
    environment: {
        type: String,
        enum: Object.values(FBREnvironment),
        default: FBREnvironment.SANDBOX
    },
    lastSyncDate: { type: Date }
}, {
    timestamps: true,
    collection: 'fbr_config'
})

export type FBRConfigDoc = IFBRConfig

export const FBRConfig = models.FBRConfig || model<FBRConfigDoc>('FBRConfig', FBRConfigSchema)
