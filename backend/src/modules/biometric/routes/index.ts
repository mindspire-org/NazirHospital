import { Router } from 'express'
import { adminGuard } from '../../../common/middleware/admin_guard'
import * as Mappings from '../controllers/mappings.controller'
import * as Events from '../controllers/events.controller'
import * as Sync from '../controllers/sync.controller'
import * as Device from '../controllers/device.controller'

const r = Router()

r.get('/mappings', adminGuard, Mappings.list)
r.post('/mappings', adminGuard, Mappings.upsert)
r.delete('/mappings/:id', adminGuard, Mappings.remove)

r.get('/events', adminGuard, Events.list)
r.get('/events/unknown', adminGuard, Events.listUnknown)

r.post('/sync/once', adminGuard, Sync.syncNow)

r.get('/device/users', adminGuard, Device.listDeviceUsers)

export default r
