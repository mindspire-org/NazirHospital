/**
 * FBR Helper Utilities
 * Wrapper functions to integrate FBR fiscalization into invoice creation
 */

import { FBRConfig } from '../models/FBRConfig'
import { FBRInvoice } from '../models/FBRInvoice'
import { getFBRService, initializeFBRService } from '../services/fbrService'
import { FBRInvoiceStatus, IFBRInvoiceRequest } from '../types/fbrTypes'

interface FBRHelperOptions {
    invoiceId: string
    invoiceType: 'pharmacy' | 'lab' | 'hospital' | 'diagnostic'
    invoiceNumber: string
    customerName?: string
    customerNTN?: string
    customerCNIC?: string
    customerPhone?: string
    totalAmount: number
    subtotal: number
    discount: number
    taxAmount: number
    paymentMethod: string
    items: Array<{
        medicineId?: string
        testId?: string
        itemId?: string
        name: string
        qty: number
        unitPrice: number
        taxRate?: number
    }>
}

interface FBRResult {
    success: boolean
    fbrInvoiceNumber?: string
    trackingNumber?: string
    qrCode?: string
    usin?: string
    error?: string
}

/**
 * Fiscalize an invoice with FBR
 * This is a non-blocking operation - errors won't prevent invoice creation
 */
export async function fiscalizeInvoice(options: FBRHelperOptions): Promise<FBRResult> {
    try {
        // Check if FBR is enabled
        const config = await FBRConfig.findOne().lean() as any
        if (!config || !config.isEnabled) {
            return {
                success: false,
                error: 'FBR integration is not enabled'
            }
        }

        // Initialize service with config
        const service = initializeFBRService(config)

        // Generate USIN
        const usin = service.generateUSIN(config.usinPrefix, options.invoiceNumber)

        // Convert items to FBR format
        const fbrItems = service.convertToFBRItems(options.items)

        // Build FBR request
        const fbrRequest: IFBRInvoiceRequest = {
            InvoiceNumber: options.invoiceNumber,
            POSID: config.posId,
            USIN: usin,
            DateTime: new Date().toISOString(),
            BuyerName: options.customerName || 'Walk-in Customer',
            BuyerNTN: options.customerNTN,
            BuyerCNIC: options.customerCNIC,
            BuyerPhoneNumber: options.customerPhone,
            TotalBillAmount: options.totalAmount,
            TotalQuantity: options.items.reduce((sum, item) => sum + item.qty, 0),
            TotalSaleValue: options.subtotal,
            TotalTaxCharged: options.taxAmount,
            Discount: options.discount,
            FurtherTax: 0,
            PaymentMode: service.getPaymentMode(options.paymentMethod),
            InvoiceType: 1, // Normal invoice
            Items: fbrItems
        }

        // Create FBR invoice record (pending status)
        const fbrInvoiceRecord = await FBRInvoice.create({
            invoiceId: options.invoiceId,
            invoiceType: options.invoiceType,
            posId: config.posId,
            invoiceNumber: options.invoiceNumber,
            usin,
            status: FBRInvoiceStatus.PENDING,
            retryCount: 0,
            rawRequest: fbrRequest
        })

        // Attempt to fiscalize
        const response = await service.fiscalizeInvoice(fbrRequest)

        // Update record with response
        fbrInvoiceRecord.rawResponse = response
        fbrInvoiceRecord.errorMessage = response.ErrorMessage

        if (response.FiscalInvoiceNumber || response.TrackingNumber) {
            // Success
            fbrInvoiceRecord.status = FBRInvoiceStatus.SUCCESS
            fbrInvoiceRecord.fbrInvoiceNumber = response.FiscalInvoiceNumber
            fbrInvoiceRecord.trackingNumber = response.TrackingNumber
            fbrInvoiceRecord.qrCode = response.QRCode
            fbrInvoiceRecord.fiscalizationDate = new Date()

            await fbrInvoiceRecord.save()

            return {
                success: true,
                fbrInvoiceNumber: response.FiscalInvoiceNumber,
                trackingNumber: response.TrackingNumber,
                qrCode: response.QRCode,
                usin
            }
        } else {
            // Failed
            fbrInvoiceRecord.status = FBRInvoiceStatus.FAILED
            await fbrInvoiceRecord.save()

            return {
                success: false,
                error: response.ErrorMessage || 'Fiscalization failed',
                usin
            }
        }

    } catch (error: any) {
        // Log error but don't throw - FBR errors shouldn't block invoice creation
        console.error('[FBR] Fiscalization error:', error.message)

        return {
            success: false,
            error: error.message || 'Failed to fiscalize invoice'
        }
    }
}

/**
 * Get FBR invoice details for a given invoice
 */
export async function getFBRInvoiceByInvoiceId(
    invoiceId: string,
    invoiceType: 'pharmacy' | 'lab' | 'hospital' | 'diagnostic'
): Promise<any | null> {
    try {
        const fbrInvoice = await FBRInvoice.findOne({ invoiceId, invoiceType }).lean()
        return fbrInvoice
    } catch (error) {
        return null
    }
}

/**
 * Retry a failed fiscalization
 */
export async function retryFiscalization(
    invoiceId: string,
    invoiceType: 'pharmacy' | 'lab' | 'hospital' | 'diagnostic'
): Promise<FBRResult> {
    try {
        const fbrInvoice = await FBRInvoice.findOne({ invoiceId, invoiceType })

        if (!fbrInvoice) {
            return {
                success: false,
                error: 'FBR invoice record not found'
            }
        }

        if (fbrInvoice.status === FBRInvoiceStatus.SUCCESS) {
            return {
                success: true,
                fbrInvoiceNumber: fbrInvoice.fbrInvoiceNumber,
                trackingNumber: fbrInvoice.trackingNumber,
                qrCode: fbrInvoice.qrCode,
                usin: fbrInvoice.usin
            }
        }

        if (!fbrInvoice.rawRequest) {
            return {
                success: false,
                error: 'No request data available for retry'
            }
        }

        const config = await FBRConfig.findOne().lean() as any
        if (!config || !config.isEnabled) {
            return {
                success: false,
                error: 'FBR integration is not enabled'
            }
        }

        const service = getFBRService()
        const response = await service.fiscalizeInvoice(fbrInvoice.rawRequest)

        fbrInvoice.retryCount += 1
        fbrInvoice.rawResponse = response
        fbrInvoice.errorMessage = response.ErrorMessage

        if (response.FiscalInvoiceNumber || response.TrackingNumber) {
            fbrInvoice.status = FBRInvoiceStatus.SUCCESS
            fbrInvoice.fbrInvoiceNumber = response.FiscalInvoiceNumber
            fbrInvoice.trackingNumber = response.TrackingNumber
            fbrInvoice.qrCode = response.QRCode
            fbrInvoice.fiscalizationDate = new Date()

            await fbrInvoice.save()

            return {
                success: true,
                fbrInvoiceNumber: response.FiscalInvoiceNumber,
                trackingNumber: response.TrackingNumber,
                qrCode: response.QRCode,
                usin: fbrInvoice.usin
            }
        } else {
            fbrInvoice.status = FBRInvoiceStatus.FAILED
            await fbrInvoice.save()

            return {
                success: false,
                error: response.ErrorMessage || 'Fiscalization failed',
                usin: fbrInvoice.usin
            }
        }

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Retry failed'
        }
    }
}

export default {
    fiscalizeInvoice,
    getFBRInvoiceByInvoiceId,
    retryFiscalization
}
