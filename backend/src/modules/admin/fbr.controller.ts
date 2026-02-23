import { Request, Response } from 'express'
import { FBRConfig } from '../../common/models/FBRConfig'
import { FBRInvoice } from '../../common/models/FBRInvoice'
import { getFBRService, initializeFBRService } from '../../common/services/fbrService'
import { FBRInvoiceStatus, FBREnvironment } from '../../common/types/fbrTypes'
import { env } from '../../config/env'
import { MockFbrLog } from '../hospital/models/MockFbrLog'

/**
 * Get FBR configuration
 */
export async function getConfig(_req: Request, res: Response) {
    try {
        let config = await FBRConfig.findOne()

        // If no config exists, create default from env
        if (!config) {
            config = new FBRConfig({
                posId: env.FBR_POS_ID,
                facilityName: 'Hospital Management System',
                ntn: env.FBR_NTN,
                usinPrefix: env.FBR_USIN_PREFIX,
                imsServiceUrl: env.FBR_IMS_URL,
                isEnabled: env.FBR_ENABLED,
                environment: env.FBR_ENVIRONMENT as FBREnvironment
            })
            await config.save()
        }

        res.json(config)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Update FBR configuration
 */
export async function updateConfig(req: Request, res: Response) {
    try {
        const { posId, facilityName, ntn, usinPrefix, imsServiceUrl, isEnabled, environment } = req.body

        let config = await FBRConfig.findOne()

        if (!config) {
            config = new FBRConfig(req.body)
        } else {
            if (posId !== undefined) config.posId = posId
            if (facilityName !== undefined) config.facilityName = facilityName
            if (ntn !== undefined) config.ntn = ntn
            if (usinPrefix !== undefined) config.usinPrefix = usinPrefix
            if (imsServiceUrl !== undefined) config.imsServiceUrl = imsServiceUrl
            if (isEnabled !== undefined) config.isEnabled = isEnabled
            if (environment !== undefined) config.environment = environment
        }

        await config.save()

        // Reinitialize FBR service with new config
        if (config.isEnabled) {
            initializeFBRService(config)
        }

        res.json(config)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Check IMS service status
 */
export async function checkServiceStatus(_req: Request, res: Response) {
    try {
        const config = await FBRConfig.findOne()
        const service = config ? getFBRService() : getFBRService()

        const status = await service.checkServiceStatus()

        res.json({
            ...status,
            configExists: !!config,
            isEnabled: config?.isEnabled || false
        })
    } catch (error: any) {
        res.status(500).json({
            error: error.message,
            isRunning: false,
            message: 'Failed to check service status'
        })
    }
}

/**
 * Get all FBR invoices with filtering - queries both new and old FBR systems
 */
export async function getInvoices(req: Request, res: Response) {
    try {
        const {
            status,
            invoiceType,
            startDate,
            endDate,
            limit = 50,
            skip = 0
        } = req.query

        const filter: any = {}
        const mockFilter: any = {}

        // Build filters for both databases
        if (status) {
            filter.status = status
            mockFilter.status = status
        }
        if (invoiceType) {
            filter.invoiceType = invoiceType
            mockFilter.invoiceType = invoiceType
        }
        if (startDate || endDate) {
            filter.createdAt = {}
            mockFilter.createdAt = {}
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate as string)
                mockFilter.createdAt.$gte = new Date(startDate as string)
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate as string)
                mockFilter.createdAt.$lte = new Date(endDate as string)
            }
        }

        // Query both databases
        const [fbrInvoices, mockLogs] = await Promise.all([
            FBRInvoice.find(filter).sort({ createdAt: -1 }).lean(),
            (MockFbrLog as any).find(mockFilter).sort({ createdAt: -1 }).lean()
        ])

        // Transform MockFbrLog to match FBRInvoice structure
        const transformedMockLogs = (mockLogs as any[]).map((log: any) => ({
            _id: log._id,
            invoiceId: log.refId,
            invoiceType: log.invoiceType || 'OPD',
            invoiceNumber: log.module && log.refId ? `${log.module}-${log.refId}` : '',
            fbrInvoiceNumber: log.fbrInvoiceNo,
            status: log.status,
            customerName: '',
            totalAmount: log.amount || 0,
            createdAt: log.createdAt,
            qrCode: log.qrCode,
            errorMessage: log.error,
            rawRequest: log.payload,
            source: 'legacy' // Mark as legacy system
        }))

        // Merge and sort all invoices
        const allInvoices = [...fbrInvoices, ...transformedMockLogs]
            .sort((a: any, b: any) => {
                const dateA = new Date(a.createdAt || 0).getTime()
                const dateB = new Date(b.createdAt || 0).getTime()
                return dateB - dateA
            })

        // Apply pagination
        const total = allInvoices.length
        const paginatedInvoices = allInvoices.slice(Number(skip), Number(skip) + Number(limit))

        res.json({
            invoices: paginatedInvoices,
            total,
            limit: Number(limit),
            skip: Number(skip)
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Get FBR invoice by ID
 */
export async function getInvoiceById(req: Request, res: Response) {
    try {
        const { id } = req.params
        const invoice = await FBRInvoice.findById(id)

        if (!invoice) {
            return res.status(404).json({ error: 'FBR invoice not found' })
        }

        res.json(invoice)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Retry failed fiscalization for a single invoice
 */
export async function retryInvoice(req: Request, res: Response) {
    try {
        const { id } = req.params
        const invoice = await FBRInvoice.findById(id)

        if (!invoice) {
            return res.status(404).json({ error: 'FBR invoice not found' })
        }

        if (invoice.status === FBRInvoiceStatus.SUCCESS) {
            return res.status(400).json({ error: 'Invoice already fiscalized successfully' })
        }

        const config = await FBRConfig.findOne()
        if (!config || !config.isEnabled) {
            return res.status(400).json({ error: 'FBR is not enabled' })
        }

        const service = getFBRService()

        // Use the saved request data to retry
        if (!invoice.rawRequest) {
            return res.status(400).json({ error: 'No request data available for retry' })
        }

        const response = await service.fiscalizeInvoice(invoice.rawRequest)

        // Update invoice record
        invoice.retryCount += 1
        invoice.rawResponse = response
        invoice.errorMessage = response.ErrorMessage

        if (response.FiscalInvoiceNumber) {
            invoice.status = FBRInvoiceStatus.SUCCESS
            invoice.fbrInvoiceNumber = response.FiscalInvoiceNumber
            invoice.trackingNumber = response.TrackingNumber
            invoice.qrCode = response.QRCode
            invoice.fiscalizationDate = new Date()
        } else {
            invoice.status = FBRInvoiceStatus.FAILED
        }

        await invoice.save()

        res.json(invoice)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Bulk retry failed invoices
 */
export async function bulkRetry(req: Request, res: Response) {
    try {
        const { invoiceIds } = req.body

        if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return res.status(400).json({ error: 'invoiceIds must be a non-empty array' })
        }

        const config = await FBRConfig.findOne()
        if (!config || !config.isEnabled) {
            return res.status(400).json({ error: 'FBR is not enabled' })
        }

        const service = getFBRService()
        const results = {
            total: invoiceIds.length,
            success: 0,
            failed: 0,
            skipped: 0
        }

        for (const id of invoiceIds) {
            try {
                const invoice = await FBRInvoice.findById(id)

                if (!invoice || !invoice.rawRequest) {
                    results.skipped++
                    continue
                }

                if (invoice.status === FBRInvoiceStatus.SUCCESS) {
                    results.skipped++
                    continue
                }

                const response = await service.fiscalizeInvoice(invoice.rawRequest)
                invoice.retryCount += 1
                invoice.rawResponse = response
                invoice.errorMessage = response.ErrorMessage

                if (response.FiscalInvoiceNumber) {
                    invoice.status = FBRInvoiceStatus.SUCCESS
                    invoice.fbrInvoiceNumber = response.FiscalInvoiceNumber
                    invoice.trackingNumber = response.TrackingNumber
                    invoice.qrCode = response.QRCode
                    invoice.fiscalizationDate = new Date()
                    results.success++
                } else {
                    invoice.status = FBRInvoiceStatus.FAILED
                    results.failed++
                }

                await invoice.save()
            } catch (err) {
                results.failed++
            }
        }

        res.json(results)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Get statistics about FBR invoices
 */
export async function getStatistics(_req: Request, res: Response) {
    try {
        const total = await FBRInvoice.countDocuments()
        const success = await FBRInvoice.countDocuments({ status: FBRInvoiceStatus.SUCCESS })
        const failed = await FBRInvoice.countDocuments({ status: FBRInvoiceStatus.FAILED })
        const pending = await FBRInvoice.countDocuments({ status: FBRInvoiceStatus.PENDING })

        // Get stats by invoice type
        const byType = await FBRInvoice.aggregate([
            {
                $group: {
                    _id: '$invoiceType',
                    count: { $sum: 1 },
                    successCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', FBRInvoiceStatus.SUCCESS] }, 1, 0]
                        }
                    }
                }
            }
        ])

        res.json({
            total,
            success,
            failed,
            pending,
            successRate: total > 0 ? ((success / total) * 100).toFixed(2) : '0',
            byType
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
}
