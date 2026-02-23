import { Router } from 'express'
import * as Companies from '../controllers/company.controller'
import * as RateRules from '../controllers/rate_rule.controller'
import * as Tx from '../controllers/transaction.controller'
import * as Claims from '../controllers/claim.controller'
import * as Payments from '../controllers/payment.controller'
import * as Reports from '../controllers/report.controller'

const r = Router()

// Companies
r.get('/companies', Companies.list)
r.post('/companies', Companies.create)
r.put('/companies/:id', Companies.update)
r.delete('/companies/:id', Companies.remove)

// Rate Rules
r.get('/rate-rules', RateRules.list)
r.post('/rate-rules', RateRules.create)
r.put('/rate-rules/:id', RateRules.update)
r.delete('/rate-rules/:id', RateRules.remove)

// Transactions
r.get('/transactions', Tx.list)

// Claims
r.get('/claims', Claims.list)
r.get('/claims/:id', Claims.getById)
r.post('/claims/generate', Claims.generate)
r.post('/claims/:id/lock', Claims.lock)
r.post('/claims/:id/unlock', Claims.unlock)
r.get('/claims/:id/export', Claims.exportCsv)
// Delete claim (must be unlocked)
r.delete('/claims/:id', Claims.remove)

// Payments
r.get('/payments', Payments.list)
r.get('/payments/:id', Payments.getById)
r.post('/payments', Payments.create)

// Reports
r.get('/reports/outstanding', Reports.outstanding)
r.get('/reports/aging', Reports.aging)

export default r
