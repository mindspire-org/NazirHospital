/**
 * Generate FBR QR Code Data
 * QR Code contains all mandatory FBR fields for invoice verification
 */
export function generateFBRQRCode(invoiceData: {
    invoiceNumber: string
    posId: string
    usin: string
    dateTime: string
    buyerName: string
    buyerNTN?: string
    totalAmount: number
    totalTax: number
    fbrInvoiceNumber?: string
    trackingNumber?: string
}): string {
    // FBR QR Code format includes all mandatory fields
    const qrData = {
        InvoiceNumber: invoiceData.invoiceNumber,
        POSID: invoiceData.posId,
        USIN: invoiceData.usin,
        DateTime: invoiceData.dateTime,
        BuyerName: invoiceData.buyerName,
        BuyerNTN: invoiceData.buyerNTN || '',
        TotalAmount: invoiceData.totalAmount,
        TotalTax: invoiceData.totalTax,
        FBRInvoiceNumber: invoiceData.fbrInvoiceNumber || '',
        TrackingNumber: invoiceData.trackingNumber || ''
    }

    // Return as JSON string for QR code generation
    return JSON.stringify(qrData)
}

/**
 * Parse QR Code from IMS response
 * IMS may return QR code as base64 image or raw data
 */
export function parseQRCodeFromResponse(response: any): string | undefined {
    // Check various possible QR code fields
    if (response.QRCode) return response.QRCode
    if (response.qrCode) return response.qrCode
    if (response.QR) return response.QR
    if (response.qr) return response.qr

    // If no QR code in response, we can generate one from the data
    return undefined
}
