/**
 * FBR Service - Handles communication with local IMS fiscal device
 * IMS runs on localhost:8524 and fiscalizes invoices for FBR compliance
 */

import {
    IFBRInvoiceRequest,
    IFBRInvoiceResponse,
    IIMSServiceStatus,
    IFBRConfig
} from '../types/fbrTypes'

export class FBRService {
    private baseUrl: string
    private maxRetries: number = 3
    private retryDelay: number = 1000 // ms

    constructor(imsServiceUrl: string = 'http://localhost:8524') {
        this.baseUrl = imsServiceUrl
    }

    /**
     * Check if IMS service is running and accessible
     */
    async checkServiceStatus(): Promise<IIMSServiceStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/api/IMSFiscal/get`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            })

            if (response.ok) {
                const text = await response.text()
                return {
                    isRunning: text.includes('Service is responding') || text.includes('responding'),
                    message: 'IMS service is accessible',
                    url: this.baseUrl
                }
            }

            return {
                isRunning: false,
                message: `IMS service returned status ${response.status}`,
                url: this.baseUrl
            }
        } catch (error: any) {
            return {
                isRunning: false,
                message: error.message || 'Failed to connect to IMS service',
                url: this.baseUrl
            }
        }
    }

    /**
     * Fiscalize an invoice by sending it to the IMS service
     * @param invoiceData - Invoice data formatted for FBR
     * @param retryCount - Current retry attempt (internal use)
     */
    async fiscalizeInvoice(
        invoiceData: IFBRInvoiceRequest,
        retryCount: number = 0
    ): Promise<IFBRInvoiceResponse> {
        try {
            // First check if service is running
            const status = await this.checkServiceStatus()
            if (!status.isRunning) {
                throw new Error(`IMS service is not accessible: ${status.message}`)
            }

            // Send invoice to IMS for fiscalization
            const response = await fetch(`${this.baseUrl}/api/IMSFiscal/GetInvoiceNumberByModel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(invoiceData),
                signal: AbortSignal.timeout(15000) // 15 second timeout
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`IMS returned error: ${response.status} - ${errorText}`)
            }

            const responseData = await response.json() as IFBRInvoiceResponse

            // Check if fiscalization was successful
            if (responseData.Code === '100' || responseData.Status === 'Success') {
                return {
                    ...responseData,
                    InvoiceNumber: invoiceData.InvoiceNumber,
                    USIN: invoiceData.USIN,
                    DateTime: invoiceData.DateTime
                }
            }

            // If fiscalization failed, return error response
            return {
                InvoiceNumber: invoiceData.InvoiceNumber,
                USIN: invoiceData.USIN,
                DateTime: invoiceData.DateTime,
                ErrorMessage: responseData.ErrorMessage || responseData.Response || 'Fiscalization failed'
            }

        } catch (error: any) {
            // Retry logic for network errors
            if (retryCount < this.maxRetries) {
                await this.sleep(this.retryDelay * (retryCount + 1))
                return this.fiscalizeInvoice(invoiceData, retryCount + 1)
            }

            // Return error response after all retries exhausted
            return {
                InvoiceNumber: invoiceData.InvoiceNumber,
                USIN: invoiceData.USIN,
                DateTime: invoiceData.DateTime,
                ErrorMessage: error.message || 'Failed to fiscalize invoice'
            }
        }
    }

    /**
     * Generate USIN (Unique Sales Invoice Number)
     * Format: PREFIX-YYYYMMDD-HHMMSS-XXXXX
     */
    generateUSIN(prefix: string, invoiceNumber: string): string {
        const now = new Date()
        const date = now.toISOString().slice(0, 10).replace(/-/g, '')
        const time = now.toISOString().slice(11, 19).replace(/:/g, '')
        const uniquePart = invoiceNumber.replace(/[^0-9]/g, '').padStart(5, '0').slice(-5)

        return `${prefix}-${date}-${time}-${uniquePart}`
    }

    /**
     * Convert invoice items to FBR format
     * Helper method for transforming application invoice items to FBR schema
     */
    convertToFBRItems(items: any[], invoiceType: number = 1): any[] {
        return items.map((item, index) => ({
            ItemCode: item.medicineId || item.testId || item.itemId || `ITEM-${index + 1}`,
            ItemName: item.name || item.description || 'Item',
            Quantity: item.qty || item.quantity || 1,
            PCTCode: item.pctCode || '0000.0000', // Pakistan Customs Tariff Code
            TaxRate: item.taxRate || 0,
            SaleValue: (item.unitPrice || 0) * (item.qty || 1),
            TaxCharged: item.taxAmount || 0,
            Discount: item.discount || 0,
            FurtherTax: item.furtherTax || 0,
            TotalAmount: item.total || ((item.unitPrice || 0) * (item.qty || 1)),
            InvoiceType: invoiceType,
            RefUSIN: item.refUSIN || undefined
        }))
    }

    /**
     * Helper to map payment method to FBR payment mode
     */
    getPaymentMode(paymentMethod: string): number {
        const mapping: { [key: string]: number } = {
            'Cash': 1,
            'Card': 2,
            'Credit Card': 2,
            'Debit Card': 2,
            'Credit': 3,
            'Mobile Wallet': 4,
            'Voucher': 5
        }
        return mapping[paymentMethod] || 1 // Default to Cash
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

/**
 * Singleton instance of FBR Service
 * Will be initialized with config from database
 */
let fbrServiceInstance: FBRService | null = null

export function initializeFBRService(config: IFBRConfig): FBRService {
    fbrServiceInstance = new FBRService(config.imsServiceUrl)
    return fbrServiceInstance
}

export function getFBRService(): FBRService {
    if (!fbrServiceInstance) {
        // Default to localhost if not initialized
        fbrServiceInstance = new FBRService()
    }
    return fbrServiceInstance
}

export default FBRService
