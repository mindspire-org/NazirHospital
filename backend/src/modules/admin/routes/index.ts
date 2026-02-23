import { Router } from 'express'
import { exportAll, purgeAll, restoreAll } from '../backup.controller'
import { adminGuard } from '../../../common/middleware/admin_guard'

const r = Router()

r.get('/backup/export', adminGuard, exportAll)
r.post('/backup/restore', adminGuard, restoreAll)
r.post('/backup/purge', adminGuard, purgeAll)

export default r
