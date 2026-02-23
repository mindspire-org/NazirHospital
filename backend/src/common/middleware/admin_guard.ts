import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'

export function adminGuard(req: Request, res: Response, next: NextFunction){
  // Allow via Admin Key header
  const keyHdr = String(req.headers['x-admin-key'] || '')
  if (keyHdr && keyHdr === env.ADMIN_KEY) return next()

  // Allow via Bearer token with admin role
  const auth = String(req.headers['authorization'] || '')
  const bearer = auth.startsWith('Bearer ')? auth.slice(7) : ''
  if (bearer){
    try{
      const payload: any = jwt.verify(bearer, env.JWT_SECRET)
      const role = String(payload?.role || '')
      if (/^admin$/i.test(role)) return next()
    }catch{}
  }

  return res.status(403).json({ error: 'Forbidden: admin access required' })
}
