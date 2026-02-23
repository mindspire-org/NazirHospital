/**
 * FBR (Federal Board of Revenue) Integration Types
 * For Pakistan's real-time POS invoicing system
 */

export enum FBRInvoiceStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
    RETRY = 'retry'
}

export enum FBREnvironment {
    SANDBOX = 'sandbox',
    PRODUCTION = 'production'
}

export interface IFBRInvoiceItem {
    ItemCode: string
    ItemName: string
    Quantity: number
    PCTCode: string
    TaxRate: number
    SaleValue: number
    TaxCharged: number
    Discount: number
    FurtherTax: number
    TotalAmount: number
    InvoiceType: number
    RefUSIN?: string
}

export interface IFBRInvoiceRequest {
    InvoiceNumber: string
    POSID: string
    USIN: string
    DateTime: string
    BuyerName: string
    BuyerNTN?: string
    BuyerCNIC?: string
    BuyerPhoneNumber?: string
    TotalBillAmount: number
    TotalQuantity: number
    TotalSaleValue: number
    TotalTaxCharged: number
    Discount: number
    FurtherTax: number
    PaymentMode: number  // 1=Cash, 2=Credit/Debit Card, 3=Credit, 4=Mobile Wallet, 5=Voucher
    RefUSIN?: string
    InvoiceType: number  // 1=Normal Invoice, 2=Return
    Items: IFBRInvoiceItem[]
}

export interface IFBRInvoiceResponse {
    InvoiceNumber: string
    USIN: string
    FiscalInvoiceNumber?: string
    DateTime: string
    Response?: string
    Code?: string
    Status?: string
    TrackingNumber?: string
    QRCode?: string
    ErrorMessage?: string
}

export interface IFBRConfig {
    _id?: string
    posId: string
    facilityName: string
    ntn: string
    usinPrefix: string
    imsServiceUrl: string
    isEnabled: boolean
    environment: FBREnvironment
    lastSyncDate?: Date
    createdAt?: Date
    updatedAt?: Date
}

export interface IFBRInvoiceRecord {
    _id?: string
    invoiceId: string
    invoiceType: 'pharmacy' | 'lab' | 'hospital' | 'diagnostic'
    posId: string
    invoiceNumber: string
    fbrInvoiceNumber?: string
    usin: string
    trackingNumber?: string
    qrCode?: string
    fiscalizationDate?: Date
    status: FBRInvoiceStatus
    errorMessage?: string
    retryCount: number
    rawRequest?: any
    rawResponse?: any
    createdAt?: Date
    updatedAt?: Date
}

export interface IIMSServiceStatus {
    isRunning: boolean
    message: string
    url: string
}
